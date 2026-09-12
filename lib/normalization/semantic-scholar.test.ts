import { describe, expect, it } from "vitest";
import type { FoundPaper } from "@/lib/academic/semantic-scholar";
import { normalizeSemanticScholarPaper } from "@/lib/normalization/semantic-scholar";

const DOI = "10.1162/neco.1997.9.8.1735";

/** Lo minimo que el cliente garantiza: un titulo. */
function raw(overrides: Partial<FoundPaper> = {}): FoundPaper {
  return { title: "Un artículo", ...overrides };
}

describe("campos ausentes", () => {
  it("no inventa nada cuando la fuente no da casi nada", () => {
    const paper = normalizeSemanticScholarPaper(raw(), DOI);

    expect(paper.abstract).toBeUndefined();
    expect(paper.year).toBeUndefined();
    expect(paper.venue).toBeUndefined();
    expect(paper.publisher).toBeUndefined();
    expect(paper.publicationType).toBeUndefined();
    expect(paper.metrics).toBeUndefined();
    expect(paper.authors).toEqual([]);
    expect(paper.institutions).toEqual([]);
    expect(paper.countries).toEqual([]);
    expect(paper.topics).toEqual([]);
  });

  it("distingue un recuento ausente de un cero real", () => {
    const sinDatos = normalizeSemanticScholarPaper(raw(), DOI);
    expect(sinDatos.citationCount).toBeUndefined();

    // Un articulo sin citas tiene cero citas: eso es un dato, no una ausencia.
    const sinCitas = normalizeSemanticScholarPaper(
      raw({ citationCount: 0, referenceCount: 0 }),
      DOI,
    );
    expect(sinCitas.citationCount).toBe(0);
    expect(sinCitas.referenceCount).toBe(0);
  });

  it("trata las cadenas vacías de la API como campo ausente", () => {
    // La API devuelve openAccessPdf.url = "" cuando el PDF no es abierto.
    const paper = normalizeSemanticScholarPaper(
      raw({
        abstract: "   ",
        openAccessPdf: { url: "", status: "CLOSED" },
        venue: "",
      }),
      DOI,
    );

    expect(paper.abstract).toBeUndefined();
    expect(paper.urls.pdf).toBeUndefined();
    expect(paper.venue).toBeUndefined();
  });
});

describe("tipo de publicación", () => {
  // La API llega a devolver ["Book","JournalArticle","Conference"] para una
  // misma ponencia, asi que publicationVenue.type manda.
  it("prefiere publicationVenue.type a los publicationTypes contradictorios", () => {
    const paper = normalizeSemanticScholarPaper(
      raw({
        publicationVenue: { type: "conference" },
        publicationTypes: ["Book", "JournalArticle", "Conference"],
      }),
      DOI,
    );

    expect(paper.publicationType).toBe("conference-paper");
  });

  it("recurre a publicationTypes cuando no hay tipo de venue", () => {
    expect(
      normalizeSemanticScholarPaper(
        raw({ publicationTypes: ["JournalArticle"] }),
        DOI,
      ).publicationType,
    ).toBe("journal-article");
  });
});

describe("tópicos", () => {
  it("deduplica sin distinguir mayúsculas y conserva el orden", () => {
    const paper = normalizeSemanticScholarPaper(
      raw({
        s2FieldsOfStudy: [
          { category: "Computer Science", source: "external" },
          { category: "Mathematics", source: "external" },
          { category: "computer science", source: "s2-fos-model" },
        ],
        fieldsOfStudy: ["Computer Science", "Medicine"],
      }),
      DOI,
    );

    expect(paper.topics).toEqual([
      "Computer Science",
      "Mathematics",
      "Medicine",
    ]);
  });
});

describe("autores e instituciones", () => {
  it("no deduce el país a partir de la afiliación", () => {
    const paper = normalizeSemanticScholarPaper(
      raw({
        authors: [
          { authorId: "1", name: "Ana Ruiz", affiliations: ["Universidad de Lima"] },
        ],
      }),
      DOI,
    );

    expect(paper.institutions).toEqual([{ name: "Universidad de Lima" }]);
    // "Universidad de Lima" sugiere Perú, pero la fuente no lo dice.
    expect(paper.institutions[0].country).toBeUndefined();
    expect(paper.countries).toEqual([]);
  });

  it("deja las instituciones vacías cuando la API no trae afiliaciones", () => {
    // El caso habitual de Semantic Scholar.
    const paper = normalizeSemanticScholarPaper(
      raw({
        authors: [
          { authorId: "1", name: "Sepp Hochreiter", affiliations: [] },
          { authorId: null, name: "Jrgen Schmidhuber" },
        ],
      }),
      DOI,
    );

    expect(paper.authors).toHaveLength(2);
    expect(paper.institutions).toEqual([]);
    expect(paper.countries).toEqual([]);
  });

  it("descarta autores sin nombre y conserva la posición de firma original", () => {
    const paper = normalizeSemanticScholarPaper(
      raw({
        authors: [
          { name: "Primera Autora" },
          { name: "  " },
          { name: "Tercer Autor" },
        ],
      }),
      DOI,
    );

    expect(paper.authors.map((author) => author.name)).toEqual([
      "Primera Autora",
      "Tercer Autor",
    ]);
    // Se mantiene 3, no se renumera a 2: refleja el orden real de firma.
    expect(paper.authors.map((author) => author.position)).toEqual([1, 3]);
  });

  it("deduplica instituciones repetidas entre coautores", () => {
    const paper = normalizeSemanticScholarPaper(
      raw({
        authors: [
          { name: "A", affiliations: ["Universidad X"] },
          { name: "B", affiliations: ["universidad x"] },
          { name: "C", affiliations: ["Instituto Y"] },
        ],
      }),
      DOI,
    );

    expect(paper.institutions.map((i) => i.name)).toEqual([
      "Universidad X",
      "Instituto Y",
    ]);
  });

  it("extrae el ORCID cuando la API lo da como lista", () => {
    const paper = normalizeSemanticScholarPaper(
      raw({
        authors: [
          { name: "Ana Ruiz", externalIds: { ORCID: ["0000-0002-1825-0097"] } },
          { name: "Luis Paz", externalIds: { DBLP: ["Luis Paz"] } },
        ],
      }),
      DOI,
    );

    expect(paper.authors[0].orcid).toBe("0000-0002-1825-0097");
    expect(paper.authors[1].orcid).toBeUndefined();
  });
});

describe("identidad y procedencia", () => {
  it("prefiere el DOI canónico de la API y lo pasa a minúsculas", () => {
    const paper = normalizeSemanticScholarPaper(
      raw({ externalIds: { DOI: "10.1162/NECO.1997.9.8.1735" } }),
      DOI,
    );

    expect(paper.doi).toBe("10.1162/neco.1997.9.8.1735");
  });

  it("recurre al DOI consultado cuando la API no lo devuelve", () => {
    expect(normalizeSemanticScholarPaper(raw(), DOI).doi).toBe(DOI);
  });

  it("declara siempre su procedencia", () => {
    const paper = normalizeSemanticScholarPaper(raw(), DOI);

    expect(paper.source).toHaveLength(1);
    expect(paper.source[0].name).toBe("semantic-scholar");
    expect(paper.source[0].retrievedAt).toBeTruthy();
  });

  it("enlaza a doi.org cuando la API no da URL del artículo", () => {
    expect(normalizeSemanticScholarPaper(raw(), DOI).urls.paper).toBe(
      `https://doi.org/${DOI}`,
    );
  });
});
