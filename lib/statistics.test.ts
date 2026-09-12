import { describe, expect, it } from "vitest";
import type { Paper } from "@/types/paper";
import {
  byQuartile,
  papersByYear,
  papersWithoutYear,
  summarize,
  topAuthors,
  topCountries,
  topInstitutions,
  topTopics,
} from "@/lib/statistics";

function paper(overrides: Partial<Paper> = {}): Paper {
  return {
    doi: `10.1/${Math.random()}`,
    title: "Artículo",
    authors: [],
    institutions: [],
    countries: [],
    topics: [],
    keywords: [],
    urls: {},
    source: [],
    ...overrides,
  };
}

describe("resumen", () => {
  it("cuenta entidades distintas, no repeticiones", () => {
    const resumen = summarize([
      paper({
        authors: [{ name: "Ana Ruiz" }, { name: "Luis Paz" }],
        institutions: [{ name: "Universidad X", country: "ES" }],
        countries: ["ES"],
        topics: ["Educación"],
      }),
      paper({
        authors: [{ name: "ana ruiz" }],
        institutions: [{ name: "universidad x", country: "ES" }],
        countries: ["ES"],
        topics: ["educación", "TDAH"],
      }),
    ]);

    expect(resumen.papers).toBe(2);
    expect(resumen.authors).toBe(2);
    expect(resumen.institutions).toBe(1);
    expect(resumen.countries).toBe(1);
    expect(resumen.topics).toBe(2);
  });

  it("prefiere el identificador de fuente al nombre para contar autores", () => {
    // Dos grafías del mismo autor con el mismo id son una sola persona.
    const resumen = summarize([
      paper({ authors: [{ externalId: "a1", name: "Ana Ruiz" }] }),
      paper({ authors: [{ externalId: "a1", name: "A. Ruiz" }] }),
    ]);
    expect(resumen.authors).toBe(1);
  });

  it("suma solo las citas que constan y dice cuántas faltan", () => {
    const resumen = summarize([
      paper({ citationCount: 100 }),
      paper({ citationCount: 0 }),
      paper(),
    ]);

    // Cero citas suma cero; sin dato no suma y se cuenta aparte.
    expect(resumen.citations).toBe(100);
    expect(resumen.papersWithoutCitations).toBe(1);
  });

  it("una biblioteca vacía da ceros", () => {
    expect(summarize([])).toEqual({
      papers: 0,
      authors: 0,
      institutions: 0,
      countries: 0,
      topics: 0,
      citations: 0,
      papersWithoutCitations: 0,
    });
  });
});

describe("artículos por año", () => {
  it("incluye los años sin ninguno", () => {
    // Sin los ceros, 1997 y 2000 parecerían consecutivos.
    const buckets = papersByYear([
      paper({ year: 1997 }),
      paper({ year: 2000 }),
      paper({ year: 2000 }),
    ]);

    expect(buckets).toEqual([
      { label: "1997", count: 1 },
      { label: "1998", count: 0 },
      { label: "1999", count: 0 },
      { label: "2000", count: 2 },
    ]);
  });

  it("no inventa un rango cuando ningún artículo tiene año", () => {
    expect(papersByYear([paper(), paper()])).toEqual([]);
  });

  it("cuenta aparte los artículos sin año", () => {
    expect(papersWithoutYear([paper({ year: 2020 }), paper()])).toBe(1);
  });
});

describe("cuartiles", () => {
  it("siempre muestra las cuatro categorías y el sin dato", () => {
    const buckets = byQuartile([paper()]);
    expect(buckets.map((b) => b.label)).toEqual([
      "Q1",
      "Q2",
      "Q3",
      "Q4",
      "Sin dato",
    ]);
  });

  it("cuenta como sin dato lo que ninguna fuente publica", () => {
    // Es el caso real hoy: ninguna fuente integrada publica cuartil.
    const buckets = byQuartile([paper(), paper()]);
    expect(buckets.find((b) => b.label === "Sin dato")?.count).toBe(2);
  });

  it("cuenta el cuartil cuando existe", () => {
    const buckets = byQuartile([
      paper({
        metrics: [{ source: "scimago", year: 2024, quartile: "Q1" }],
      }),
      paper(),
    ]);
    expect(buckets.find((b) => b.label === "Q1")?.count).toBe(1);
    expect(buckets.find((b) => b.label === "Sin dato")?.count).toBe(1);
  });
});

describe("rankings", () => {
  const biblioteca = [
    paper({
      topics: ["Educación", "TDAH"],
      countries: ["ES", "PE"],
      institutions: [{ name: "Universidad X" }],
      authors: [{ name: "Ana Ruiz" }],
    }),
    paper({
      topics: ["educación"],
      countries: ["ES"],
      institutions: [{ name: "universidad x" }, { name: "Instituto Y" }],
      authors: [{ name: "Ana Ruiz" }, { name: "Luis Paz" }],
    }),
  ];

  it("ordena por frecuencia y conserva la grafía original", () => {
    expect(topTopics(biblioteca)).toEqual([
      { label: "Educación", count: 2 },
      { label: "TDAH", count: 1 },
    ]);
  });

  it("cuenta cada artículo una vez aunque repita el valor", () => {
    const buckets = topTopics([paper({ topics: ["Educación", "educación"] })]);
    expect(buckets).toEqual([{ label: "Educación", count: 1 }]);
  });

  it("desempata alfabéticamente para que el orden sea estable", () => {
    const buckets = topCountries(biblioteca);
    expect(buckets).toEqual([
      { label: "ES", count: 2 },
      { label: "PE", count: 1 },
    ]);
  });

  it("rankea instituciones y autores", () => {
    expect(topInstitutions(biblioteca)[0]).toEqual({
      label: "Universidad X",
      count: 2,
    });
    expect(topAuthors(biblioteca)[0]).toEqual({ label: "Ana Ruiz", count: 2 });
  });

  it("respeta el límite", () => {
    expect(topTopics(biblioteca, 1)).toHaveLength(1);
  });
});
