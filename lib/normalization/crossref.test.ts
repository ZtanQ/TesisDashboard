import { describe, expect, it } from "vitest";
import type { CrossrefWork } from "@/lib/academic/crossref";
import { normalizeCrossrefWork } from "@/lib/normalization/crossref";

const DOI = "10.1162/neco.1997.9.8.1735";

function work(overrides: Partial<CrossrefWork> = {}): CrossrefWork {
  return { title: ["Long Short-Term Memory"], ...overrides };
}

describe("formas propias de Crossref", () => {
  it("arma el nombre del autor a partir de nombre y apellido", () => {
    const paper = normalizeCrossrefWork(
      work({ author: [{ given: "Sepp", family: "Hochreiter" }] }),
      DOI,
    );
    expect(paper.authors[0].name).toBe("Sepp Hochreiter");
  });

  it("quita la URL del ORCID", () => {
    const paper = normalizeCrossrefWork(
      work({
        author: [
          { given: "A", family: "B", ORCID: "https://orcid.org/0000-0002-1" },
        ],
      }),
      DOI,
    );
    expect(paper.authors[0].orcid).toBe("0000-0002-1");
  });

  it("compone la fecha a partir de date-parts", () => {
    const paper = normalizeCrossrefWork(
      work({ issued: { "date-parts": [[1997, 11, 1]] } }),
      DOI,
    );
    expect(paper.publicationDate).toBe("1997-11-01");
    expect(paper.year).toBe(1997);
  });

  it("completa mes y día cuando solo se publica el año", () => {
    const paper = normalizeCrossrefWork(
      work({ issued: { "date-parts": [[2019]] } }),
      DOI,
    );
    expect(paper.publicationDate).toBe("2019-01-01");
  });

  it("parte el rango de páginas", () => {
    const paper = normalizeCrossrefWork(
      work({ volume: "9", issue: "8", page: "1735-1780" }),
      DOI,
    );
    expect(paper.biblio).toEqual({
      volume: "9",
      issue: "8",
      firstPage: "1735",
      lastPage: "1780",
    });
  });

  it("limpia las etiquetas JATS del abstract", () => {
    // Crossref entrega el abstract como XML, no como texto.
    const paper = normalizeCrossrefWork(
      work({
        abstract:
          "<jats:p>Aprender a almacenar información durante intervalos largos.</jats:p>",
      }),
      DOI,
    );
    expect(paper.abstract).toBe(
      "Aprender a almacenar información durante intervalos largos.",
    );
  });

  it("quita el 'Abstract' inicial que algunos editores incluyen", () => {
    const paper = normalizeCrossrefWork(
      work({ abstract: "<jats:title>Abstract</jats:title><jats:p>El texto.</jats:p>" }),
      DOI,
    );
    expect(paper.abstract).toBe("El texto.");
  });
});

describe("recuentos", () => {
  it("declara su recuento como propio, porque no coincide con los demás", () => {
    // Crossref solo cuenta lo depositado en Crossref: para el mismo artículo
    // da 2.008 donde OpenAlex da 2.961 y Semantic Scholar 1.875.
    const paper = normalizeCrossrefWork(
      work({ "is-referenced-by-count": 2008, "references-count": 26 }),
      DOI,
    );
    expect(paper.citationCounts).toEqual([{ source: "crossref", count: 2008 }]);
    expect(paper.referenceCounts).toEqual([{ source: "crossref", count: 26 }]);
  });

  it("distingue cero de ausente", () => {
    expect(
      normalizeCrossrefWork(work({ "is-referenced-by-count": 0 }), DOI)
        .citationCount,
    ).toBe(0);
    expect(normalizeCrossrefWork(work(), DOI).citationCount).toBeUndefined();
  });
});

describe("lo que Crossref no da", () => {
  it("no declara países ni palabras clave", () => {
    // No los publica de forma estructurada; se dejan vacíos en vez de
    // deducirlos de la afiliación en texto libre.
    const paper = normalizeCrossrefWork(
      work({ author: [{ given: "A", family: "B", affiliation: [{ name: "Universidad X" }] }] }),
      DOI,
    );
    expect(paper.countries).toEqual([]);
    expect(paper.keywords).toEqual([]);
    expect(paper.institutions).toEqual([{ name: "Universidad X" }]);
  });

  it("no publica métricas de revista", () => {
    expect(normalizeCrossrefWork(work(), DOI).metrics).toBeUndefined();
  });

  it("declara su procedencia", () => {
    expect(normalizeCrossrefWork(work(), DOI).source[0].name).toBe("crossref");
  });
});
