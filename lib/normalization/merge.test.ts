import { describe, expect, it } from "vitest";
import type { Paper } from "@/types/paper";
import { mergePapers } from "@/lib/normalization/merge";

function paper(overrides: Partial<Paper> = {}): Paper {
  return {
    title: "Título",
    authors: [],
    institutions: [],
    countries: [],
    topics: [],
    urls: {},
    source: [],
    ...overrides,
  };
}

describe("título y abstract", () => {
  // OpenAlex devuelve "Optuna" para un artículo cuyo título completo, según
  // Semantic Scholar, es "Optuna: A Next-generation Hyperparameter...".
  it("gana el título completo aunque venga de la fuente secundaria", () => {
    const merged = mergePapers(
      paper({ title: "Optuna" }),
      paper({ title: "Optuna: A Next-generation Hyperparameter Framework" }),
    );

    expect(merged.title).toBe(
      "Optuna: A Next-generation Hyperparameter Framework",
    );
  });

  it("gana el abstract más largo, sin mezclar los dos", () => {
    const merged = mergePapers(
      paper({ abstract: "Resumen corto." }),
      paper({ abstract: "Un resumen bastante más largo y completo." }),
    );

    expect(merged.abstract).toBe("Un resumen bastante más largo y completo.");
  });

  it("usa el abstract que exista cuando solo hay uno", () => {
    expect(
      mergePapers(paper(), paper({ abstract: "Solo aquí." })).abstract,
    ).toBe("Solo aquí.");
  });
});

describe("huecos", () => {
  it("la fuente secundaria rellena lo que falta en la preferida", () => {
    // OpenAlex no siempre trae venue; Semantic Scholar sí.
    const merged = mergePapers(
      paper({ publisher: "The MIT Press" }),
      paper({ venue: "Knowledge Discovery and Data Mining", year: 2019 }),
    );

    expect(merged.publisher).toBe("The MIT Press");
    expect(merged.venue).toBe("Knowledge Discovery and Data Mining");
    expect(merged.year).toBe(2019);
  });

  it("la fuente preferida manda cuando ambas tienen valor", () => {
    const merged = mergePapers(
      paper({ venue: "Neural Computation" }),
      paper({ venue: "Neural Comput" }),
    );

    expect(merged.venue).toBe("Neural Computation");
  });
});

describe("recuentos que discrepan", () => {
  // 109.793 (Semantic Scholar) frente a 101.683 (OpenAlex) para el mismo
  // artículo: indexan corpus distintos y ninguna cifra es "la verdadera".
  it("conserva ambos recuentos con su fuente", () => {
    const merged = mergePapers(
      paper({
        citationCount: 101683,
        citationCounts: [{ source: "openalex", count: 101683 }],
      }),
      paper({
        citationCount: 109793,
        citationCounts: [{ source: "semantic-scholar", count: 109793 }],
      }),
    );

    expect(merged.citationCount).toBe(101683);
    expect(merged.citationCounts).toEqual([
      { source: "openalex", count: 101683 },
      { source: "semantic-scholar", count: 109793 },
    ]);
  });

  it("no repite una fuente en el desglose", () => {
    const merged = mergePapers(
      paper({ citationCounts: [{ source: "openalex", count: 10 }] }),
      paper({ citationCounts: [{ source: "openalex", count: 99 }] }),
    );

    expect(merged.citationCounts).toEqual([{ source: "openalex", count: 10 }]);
  });

  it("deja el desglose sin definir cuando ninguna fuente da recuento", () => {
    expect(mergePapers(paper(), paper()).citationCounts).toBeUndefined();
  });
});

describe("autores", () => {
  it("empareja por posición y conserva el nombre de la fuente preferida", () => {
    // Semantic Scholar devuelve "Jrgen Schmidhuber"; OpenAlex, bien escrito.
    const merged = mergePapers(
      paper({
        authors: [
          { name: "Sepp Hochreiter", position: 1 },
          { name: "Jürgen Schmidhuber", position: 2 },
        ],
      }),
      paper({
        authors: [
          { name: "Sepp Hochreiter", position: 1, externalId: "ss-1" },
          { name: "Jrgen Schmidhuber", position: 2, orcid: "0000-0002-1" },
        ],
      }),
    );

    expect(merged.authors.map((a) => a.name)).toEqual([
      "Sepp Hochreiter",
      "Jürgen Schmidhuber",
    ]);
    // Los datos ausentes sí se completan con la otra fuente.
    expect(merged.authors[1].orcid).toBe("0000-0002-1");
  });

  it("conserva la lista más larga sin perder el nombre preferido", () => {
    const merged = mergePapers(
      paper({ authors: [{ name: "Ana Ruiz", position: 1 }] }),
      paper({
        authors: [
          { name: "A. Ruiz", position: 1 },
          { name: "Luis Paz", position: 2 },
        ],
      }),
    );

    expect(merged.authors).toHaveLength(2);
    expect(merged.authors[0].name).toBe("Ana Ruiz");
    expect(merged.authors[1].name).toBe("Luis Paz");
  });
});

describe("listas", () => {
  it("une instituciones completando el país que falte", () => {
    const merged = mergePapers(
      paper({ institutions: [{ name: "Universidad X" }] }),
      paper({
        institutions: [
          { name: "universidad x", country: "ES" },
          { name: "Instituto Y", country: "CH" },
        ],
      }),
    );

    expect(merged.institutions).toHaveLength(2);
    expect(merged.institutions[0]).toEqual({
      externalId: undefined,
      name: "Universidad X",
      country: "ES",
    });
  });

  it("une tópicos y países sin duplicar", () => {
    const merged = mergePapers(
      paper({ topics: ["Neural Networks"], countries: ["DE"] }),
      paper({
        topics: ["neural networks", "Computer Science"],
        countries: ["DE", "CH"],
      }),
    );

    expect(merged.topics).toEqual(["Neural Networks", "Computer Science"]);
    expect(merged.countries).toEqual(["DE", "CH"]);
  });
});

describe("procedencia", () => {
  it("declara las dos fuentes", () => {
    const merged = mergePapers(
      paper({ source: [{ name: "openalex" }] }),
      paper({ source: [{ name: "semantic-scholar" }] }),
    );

    expect(merged.source.map((s) => s.name)).toEqual([
      "openalex",
      "semantic-scholar",
    ]);
  });
});
