import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Paper } from "@/types/paper";
import { isDatabaseReachable } from "@/lib/database/supabase";
import {
  deleteSavedPaper,
  getSavedPaper,
  listLibrary,
  savePaper,
} from "@/lib/database/papers";

/**
 * Tests de integracion contra una base de datos real.
 *
 * Se saltan solos cuando la base no responde, de modo que `npm test` funciona
 * en una maquina sin Docker. Para ejecutarlos:
 *   npx supabase start
 * y copiar API_URL y SERVICE_ROLE_KEY de su salida a .env.local.
 */

// Se comprueba que la base responda, no solo que haya credenciales: asi
// `npm test` pasa en una maquina sin Docker en lugar de fallar.
const describeDb = (await isDatabaseReachable()) ? describe : describe.skip;

const DOI = "10.9999/paperlens.test.persistencia";
const OTRO_DOI = "10.9999/paperlens.test.segundo";

function paperDePrueba(overrides: Partial<Paper> = {}): Paper {
  return {
    doi: DOI,
    title: "Un artículo de prueba",
    abstract: "Resumen de prueba.",
    year: 2024,
    publicationDate: "2024-05-10",
    venue: "Revista de Prueba",
    publisher: "Editorial de Prueba",
    publicationType: "journal-article",
    authors: [
      {
        externalId: "test-a1",
        name: "Ana Ruiz",
        orcid: "0000-0002-1825-0097",
        position: 1,
      },
      { externalId: "test-a2", name: "Luis Paz", position: 2 },
    ],
    institutions: [
      { name: "Universidad de Prueba", country: "PE" },
      { name: "Instituto Segundo", country: "ES" },
    ],
    countries: ["PE", "ES"],
    topics: ["Educación", "Metodología"],
    citationCount: 42,
    referenceCount: 17,
    urls: {
      paper: "https://doi.org/" + DOI,
      pdf: "https://example.org/prueba.pdf",
    },
    metrics: {
      quartile: "Q1",
      sjr: 2.5,
      citescore: 9.1,
      impactFactor: 4.2,
      source: "SCImago",
      year: 2023,
    },
    source: [{ name: "semantic-scholar", retrievedAt: "2026-01-01T00:00:00Z" }],
    ...overrides,
  };
}

describeDb("persistencia de artículos", () => {
  beforeEach(async () => {
    await deleteSavedPaper(DOI);
    await deleteSavedPaper(OTRO_DOI);
  });

  afterEach(async () => {
    await deleteSavedPaper(DOI);
    await deleteSavedPaper(OTRO_DOI);
  });

  it("guarda y recupera un artículo completo sin perder nada", async () => {
    const guardado = await savePaper(paperDePrueba());
    expect(guardado.ok).toBe(true);

    const leido = await getSavedPaper(DOI);
    expect(leido.ok).toBe(true);
    if (!leido.ok || !leido.data) throw new Error("no se recuperó el artículo");

    const paper = leido.data;
    expect(paper.title).toBe("Un artículo de prueba");
    expect(paper.year).toBe(2024);
    expect(paper.venue).toBe("Revista de Prueba");
    expect(paper.publicationType).toBe("journal-article");
    expect(paper.citationCount).toBe(42);
    expect(paper.referenceCount).toBe(17);
    expect(paper.urls.pdf).toBe("https://example.org/prueba.pdf");
    expect(paper.topics.sort()).toEqual(["Educación", "Metodología"]);
    expect(paper.source[0].name).toBe("semantic-scholar");
  });

  it("conserva el orden de firma de los autores", async () => {
    await savePaper(paperDePrueba());
    const leido = await getSavedPaper(DOI);
    if (!leido.ok || !leido.data) throw new Error("no se recuperó el artículo");

    expect(leido.data.authors.map((a) => a.name)).toEqual([
      "Ana Ruiz",
      "Luis Paz",
    ]);
    expect(leido.data.authors[0].orcid).toBe("0000-0002-1825-0097");
  });

  it("deriva los países de las instituciones guardadas", async () => {
    await savePaper(paperDePrueba());
    const leido = await getSavedPaper(DOI);
    if (!leido.ok || !leido.data) throw new Error("no se recuperó el artículo");

    expect(leido.data.institutions).toHaveLength(2);
    expect(leido.data.countries.sort()).toEqual(["ES", "PE"]);
  });

  it("guarda la métrica con su fuente y su año", async () => {
    await savePaper(paperDePrueba());
    const leido = await getSavedPaper(DOI);
    if (!leido.ok || !leido.data) throw new Error("no se recuperó el artículo");

    expect(leido.data.metrics).toEqual({
      quartile: "Q1",
      sjr: 2.5,
      citescore: 9.1,
      impactFactor: 4.2,
      source: "SCImago",
      year: 2023,
    });
  });

  it("distingue un cero real de un dato ausente al ir y volver", async () => {
    await savePaper(
      paperDePrueba({
        citationCount: 0,
        referenceCount: undefined,
        abstract: undefined,
        metrics: undefined,
      }),
    );

    const leido = await getSavedPaper(DOI);
    if (!leido.ok || !leido.data) throw new Error("no se recuperó el artículo");

    // Cero citas es un dato; sin datos de referencias es una ausencia.
    expect(leido.data.citationCount).toBe(0);
    expect(leido.data.referenceCount).toBeUndefined();
    expect(leido.data.abstract).toBeUndefined();
    expect(leido.data.metrics).toBeUndefined();
  });

  it("reanalizar el mismo DOI actualiza en vez de duplicar", async () => {
    await savePaper(paperDePrueba({ citationCount: 42 }));
    await savePaper(paperDePrueba({ citationCount: 99, title: "Título nuevo" }));

    const leido = await getSavedPaper(DOI);
    if (!leido.ok || !leido.data) throw new Error("no se recuperó el artículo");
    expect(leido.data.citationCount).toBe(99);
    expect(leido.data.title).toBe("Título nuevo");

    const biblioteca = await listLibrary();
    if (!biblioteca.ok) throw new Error("no se pudo listar");
    expect(biblioteca.data.filter((e) => e.doi === DOI)).toHaveLength(1);
  });

  it("al reanalizar, desaparecen los vínculos que la fuente ya no reporta", async () => {
    await savePaper(paperDePrueba());
    await savePaper(
      paperDePrueba({ topics: ["Educación"], institutions: [], countries: [] }),
    );

    const leido = await getSavedPaper(DOI);
    if (!leido.ok || !leido.data) throw new Error("no se recuperó el artículo");

    expect(leido.data.topics).toEqual(["Educación"]);
    expect(leido.data.institutions).toEqual([]);
    expect(leido.data.countries).toEqual([]);
  });

  it("reutiliza autores, instituciones y tópicos entre artículos", async () => {
    await savePaper(paperDePrueba());
    await savePaper(paperDePrueba({ doi: OTRO_DOI, title: "Segundo artículo" }));

    const primero = await getSavedPaper(DOI);
    const segundo = await getSavedPaper(OTRO_DOI);
    if (!primero.ok || !primero.data || !segundo.ok || !segundo.data) {
      throw new Error("no se recuperaron los artículos");
    }

    // Mismos autores compartidos, no duplicados por artículo.
    expect(segundo.data.authors.map((a) => a.name)).toEqual([
      "Ana Ruiz",
      "Luis Paz",
    ]);
    expect(primero.data.id).not.toBe(segundo.data.id);
  });

  it("devuelve null para un artículo que no está guardado", async () => {
    const leido = await getSavedPaper("10.9999/no.guardado.jamas");
    expect(leido.ok).toBe(true);
    if (leido.ok) expect(leido.data).toBeNull();
  });

  it("lista la biblioteca con los campos del listado", async () => {
    await savePaper(paperDePrueba());

    const biblioteca = await listLibrary();
    if (!biblioteca.ok) throw new Error("no se pudo listar");

    const entrada = biblioteca.data.find((e) => e.doi === DOI);
    expect(entrada).toBeDefined();
    expect(entrada!.title).toBe("Un artículo de prueba");
    expect(entrada!.year).toBe(2024);
    expect(entrada!.quartile).toBe("Q1");
    expect(entrada!.citationCount).toBe(42);
    expect(entrada!.savedAt).toBeTruthy();
  });

  it("eliminar quita el artículo de la biblioteca", async () => {
    await savePaper(paperDePrueba());
    expect((await deleteSavedPaper(DOI)).ok).toBe(true);

    const leido = await getSavedPaper(DOI);
    if (leido.ok) expect(leido.data).toBeNull();
  });

  it("rechaza guardar un artículo sin DOI, que es su identidad", async () => {
    const resultado = await savePaper(paperDePrueba({ doi: undefined }));
    expect(resultado.ok).toBe(false);
  });
});
