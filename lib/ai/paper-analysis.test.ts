import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Paper } from "@/types/paper";
import { analyzePaper, isAiConfigured } from "@/lib/ai/paper-analysis";

/**
 * Estos tests cubren las guardas que se ejecutan ANTES de llamar al modelo.
 * Importan justamente por eso: cada llamada cuesta dinero, y una guarda mal
 * puesta se paga en cada análisis.
 *
 * La llamada al modelo en sí no se ejerce aquí: requeriría una clave y gasto
 * real en cada `npm test`.
 */

const ABSTRACT_LARGO =
  "Este trabajo presenta un ensayo controlado aleatorizado con estudiantes de secundaria, " +
  "distribuidos en un grupo experimental y un grupo de control, para medir el efecto de una " +
  "plataforma adaptativa sobre el tiempo en tarea y el rendimiento académico.";

function paper(overrides: Partial<Paper> = {}): Paper {
  return {
    doi: "10.1000/prueba",
    title: "Un artículo",
    abstract: ABSTRACT_LARGO,
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

const CLAVE_ORIGINAL = process.env.AI_API_KEY;

afterEach(() => {
  if (CLAVE_ORIGINAL === undefined) delete process.env.AI_API_KEY;
  else process.env.AI_API_KEY = CLAVE_ORIGINAL;
});

describe("sin clave configurada", () => {
  beforeEach(() => {
    delete process.env.AI_API_KEY;
  });

  it("isAiConfigured es falso", () => {
    expect(isAiConfigured()).toBe(false);
  });

  it("no intenta analizar", async () => {
    const resultado = await analyzePaper(paper());
    expect(resultado).toEqual({ ok: false, error: "not-configured" });
  });
});

describe("guardas previas a la llamada", () => {
  beforeEach(() => {
    // Clave falsa: basta para pasar la comprobación de configuración y
    // comprobar que la guarda de texto corta antes de llegar a la red.
    process.env.AI_API_KEY = "sk-ant-clave-de-prueba";
  });

  it("no analiza un artículo sin abstract", async () => {
    // Analizar solo por el título produciría conjeturas, no interpretación.
    const resultado = await analyzePaper(paper({ abstract: undefined }));
    expect(resultado).toEqual({ ok: false, error: "insufficient-text" });
  });

  it("no analiza un abstract demasiado corto", async () => {
    const resultado = await analyzePaper(paper({ abstract: "Breve nota." }));
    expect(resultado).toEqual({ ok: false, error: "insufficient-text" });
  });

  it("no analiza un abstract que solo son espacios", async () => {
    const resultado = await analyzePaper(paper({ abstract: "        " }));
    expect(resultado).toEqual({ ok: false, error: "insufficient-text" });
  });

  it("la guarda de configuración va antes que la de texto", async () => {
    // Sin clave y sin abstract, el motivo que se reporta es la falta de clave:
    // es lo que el usuario puede arreglar.
    delete process.env.AI_API_KEY;
    const resultado = await analyzePaper(paper({ abstract: undefined }));
    expect(resultado).toEqual({ ok: false, error: "not-configured" });
  });
});
