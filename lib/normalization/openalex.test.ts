import { describe, expect, it } from "vitest";
import type { OpenAlexWork } from "@/lib/academic/openalex";
import {
  normalizeOpenAlexWork,
  reconstructAbstract,
} from "@/lib/normalization/openalex";

const DOI = "10.1162/neco.1997.9.8.1735";

function work(overrides: Partial<OpenAlexWork> = {}): OpenAlexWork {
  return { title: "Long Short-Term Memory", ...overrides };
}

describe("abstract invertido", () => {
  it("reconstruye el texto en el orden correcto", () => {
    expect(
      reconstructAbstract({ Learning: [0], to: [1], store: [2] }),
    ).toBe("Learning to store");
  });

  it("coloca una palabra repetida en todas sus posiciones", () => {
    expect(reconstructAbstract({ la: [0, 2], casa: [1], grande: [3] })).toBe(
      "la casa la grande",
    );
  });

  it("descarta el abstract si el índice tiene huecos", () => {
    // Media frase es peor que declarar que no hay abstract.
    expect(reconstructAbstract({ Learning: [0], store: [2] })).toBeUndefined();
  });

  it("devuelve indefinido cuando no hay índice", () => {
    expect(reconstructAbstract(null)).toBeUndefined();
    expect(reconstructAbstract({})).toBeUndefined();
  });
});

describe("formas propias de OpenAlex", () => {
  it("quita la URL del DOI y lo pasa a minúsculas", () => {
    const paper = normalizeOpenAlexWork(
      work({ doi: "https://doi.org/10.1162/NECO.1997.9.8.1735" }),
      DOI,
    );
    expect(paper.doi).toBe(DOI);
  });

  it("quita la URL del ORCID", () => {
    const paper = normalizeOpenAlexWork(
      work({
        authorships: [
          {
            author: {
              display_name: "Sepp Hochreiter",
              orcid: "https://orcid.org/0000-0001-7449-2528",
            },
          },
        ],
      }),
      DOI,
    );
    expect(paper.authors[0].orcid).toBe("0000-0001-7449-2528");
  });
});

describe("instituciones y países", () => {
  it("extrae institución, país y ROR", () => {
    const paper = normalizeOpenAlexWork(
      work({
        authorships: [
          {
            author: { display_name: "Sepp Hochreiter" },
            institutions: [
              {
                display_name: "Technical University of Munich",
                ror: "https://ror.org/02kkvpp62",
                country_code: "de",
              },
            ],
            countries: ["DE"],
          },
        ],
      }),
      DOI,
    );

    expect(paper.institutions).toEqual([
      {
        externalId: "https://ror.org/02kkvpp62",
        name: "Technical University of Munich",
        country: "DE",
      },
    ]);
    expect(paper.countries).toEqual(["DE"]);
  });

  it("conserva el país aunque no haya institución resuelta", () => {
    const paper = normalizeOpenAlexWork(
      work({
        authorships: [
          {
            author: { display_name: "Ana Ruiz" },
            institutions: [],
            countries: ["PE"],
          },
        ],
      }),
      DOI,
    );

    expect(paper.institutions).toEqual([]);
    expect(paper.countries).toEqual(["PE"]);
  });
});

describe("tipo de publicación", () => {
  it.each([
    ["article", undefined, "journal-article"],
    ["conference-paper", undefined, "conference-paper"],
    ["book-chapter", undefined, "book-chapter"],
    ["preprint", undefined, "preprint"],
    ["dataset", undefined, "other"],
  ])("mapea %s -> %s", (type, _sourceType, expected) => {
    expect(normalizeOpenAlexWork(work({ type }), DOI).publicationType).toBe(
      expected,
    );
  });

  it("distingue un preprint alojado en un repositorio", () => {
    const paper = normalizeOpenAlexWork(
      work({
        type: "article",
        primary_location: { source: { type: "repository" } },
      }),
      DOI,
    );
    expect(paper.publicationType).toBe("preprint");
  });
});

describe("recuentos y procedencia", () => {
  it("declara el recuento con su fuente", () => {
    const paper = normalizeOpenAlexWork(
      work({ cited_by_count: 101683, referenced_works_count: 34 }),
      DOI,
    );

    expect(paper.citationCount).toBe(101683);
    expect(paper.citationCounts).toEqual([
      { source: "openalex", count: 101683 },
    ]);
    expect(paper.referenceCounts).toEqual([{ source: "openalex", count: 34 }]);
  });

  it("distingue cero citas de un recuento ausente", () => {
    expect(
      normalizeOpenAlexWork(work({ cited_by_count: 0 }), DOI).citationCount,
    ).toBe(0);
    expect(normalizeOpenAlexWork(work(), DOI).citationCount).toBeUndefined();
  });

  it("no inventa métricas: OpenAlex no publica cuartil", () => {
    expect(normalizeOpenAlexWork(work(), DOI).metrics).toBeUndefined();
  });

  it("declara su procedencia", () => {
    const paper = normalizeOpenAlexWork(work(), DOI);
    expect(paper.source[0].name).toBe("openalex");
  });
});
