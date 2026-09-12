import { describe, expect, it } from "vitest";
import type { Paper } from "@/types/paper";
import type { PaperAnalysis } from "@/types/analysis";
import {
  compareTopics,
  methodologies,
  spread,
  topicFrequency,
  unionCountries,
  type ComparedPaper,
} from "@/lib/comparison";

function paper(doi: string, overrides: Partial<Paper> = {}): Paper {
  return {
    doi,
    title: `Artículo ${doi}`,
    authors: [],
    institutions: [],
    countries: [],
    topics: [],
    urls: {},
    source: [],
    ...overrides,
  };
}

function comparado(p: Paper, analysis: PaperAnalysis | null = null): ComparedPaper {
  return { paper: p, analysis };
}

function analisis(overrides: Partial<PaperAnalysis> = {}): PaperAnalysis {
  return {
    summary: "Resumen.",
    objective: null,
    problem: null,
    methodology: null,
    sample: null,
    dataset: null,
    mainFindings: [],
    limitations: [],
    topics: [],
    relevance: null,
    generatedAt: "2026-01-01T00:00:00Z",
    model: "claude-opus-5",
    basedOn: "metadata+abstract",
    ...overrides,
  };
}

describe("tópicos compartidos y exclusivos", () => {
  const papers = [
    comparado(paper("10.1/a", { topics: ["Educación", "TDAH", "Machine Learning"] })),
    comparado(paper("10.1/b", { topics: ["educación", "TDAH", "Encuestas"] })),
    comparado(paper("10.1/c", { topics: ["Educación", "Evaluación"] })),
  ];

  it("comparte solo lo que está en todos", () => {
    // "TDAH" está en dos de tres, así que no es compartido.
    expect(compareTopics(papers).shared).toEqual(["Educación"]);
  });

  it("compara sin distinguir mayúsculas pero conserva la grafía original", () => {
    expect(compareTopics(papers).shared).toEqual(["Educación"]);
  });

  it("identifica lo que solo tiene cada artículo", () => {
    const { uniqueByDoi } = compareTopics(papers);
    expect(uniqueByDoi["10.1/a"]).toEqual(["Machine Learning"]);
    expect(uniqueByDoi["10.1/b"]).toEqual(["Encuestas"]);
    expect(uniqueByDoi["10.1/c"]).toEqual(["Evaluación"]);
  });

  it("con un solo artículo no hay nada compartido", () => {
    // La intersección consigo mismo sería todo, y eso induce a error.
    const uno = [comparado(paper("10.1/a", { topics: ["Educación"] }))];
    expect(compareTopics(uno).shared).toEqual([]);
    expect(compareTopics(uno).uniqueByDoi["10.1/a"]).toEqual(["Educación"]);
  });

  it("sin artículos devuelve vacío", () => {
    expect(compareTopics([])).toEqual({ shared: [], uniqueByDoi: {} });
  });
});

describe("frecuencia de tópicos", () => {
  it("cuenta en cuántos artículos aparece cada uno", () => {
    const frecuencia = topicFrequency([
      comparado(paper("10.1/a", { topics: ["Educación", "TDAH"] })),
      comparado(paper("10.1/b", { topics: ["educación"] })),
      comparado(paper("10.1/c", { topics: ["Educación", "TDAH"] })),
    ]);

    expect(frecuencia).toEqual([
      { topic: "Educación", count: 3 },
      { topic: "TDAH", count: 2 },
    ]);
  });

  it("un artículo cuenta una vez aunque repita el tópico", () => {
    const frecuencia = topicFrequency([
      comparado(paper("10.1/a", { topics: ["Educación", "educación"] })),
    ]);
    expect(frecuencia).toEqual([{ topic: "Educación", count: 1 }]);
  });
});

describe("rangos numéricos", () => {
  it("da mínimo y máximo, y cuenta los que no publican el dato", () => {
    const resultado = spread(
      [
        comparado(paper("10.1/a", { citationCount: 127 })),
        comparado(paper("10.1/b", { citationCount: 54 })),
        comparado(paper("10.1/c")),
      ],
      (p) => p.citationCount,
    );

    expect(resultado).toEqual({ min: 54, max: 127, missing: 1 });
  });

  it("cero es un dato, no una ausencia", () => {
    const resultado = spread(
      [
        comparado(paper("10.1/a", { citationCount: 0 })),
        comparado(paper("10.1/b", { citationCount: 5 })),
      ],
      (p) => p.citationCount,
    );
    expect(resultado).toEqual({ min: 0, max: 5, missing: 0 });
  });

  it("devuelve null si ningún artículo publica el dato", () => {
    // Un rango de nada no es cero: es ausencia.
    expect(
      spread([comparado(paper("10.1/a"))], (p) => p.citationCount),
    ).toBeNull();
  });
});

describe("países", () => {
  it("une sin repetir y en orden de aparición", () => {
    expect(
      unionCountries([
        comparado(paper("10.1/a", { countries: ["DE", "CH"] })),
        comparado(paper("10.1/b", { countries: ["CH", "PE"] })),
      ]),
    ).toEqual(["DE", "CH", "PE"]);
  });
});

describe("metodologías", () => {
  it("distingue no analizado de analizado sin metodología declarada", () => {
    // Son dos cosas distintas y la interfaz debe poder decirlas distinto.
    const resultado = methodologies([
      comparado(paper("10.1/a"), analisis({ methodology: "Ensayo controlado." })),
      comparado(paper("10.1/b"), analisis({ methodology: null })),
      comparado(paper("10.1/c"), null),
    ]);

    expect(resultado).toEqual([
      { doi: "10.1/a", methodology: "Ensayo controlado.", analyzed: true },
      { doi: "10.1/b", methodology: null, analyzed: true },
      { doi: "10.1/c", methodology: null, analyzed: false },
    ]);
  });
});
