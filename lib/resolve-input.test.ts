import { describe, expect, it } from "vitest";
import { doiEnTextoDePdf, resolveInput, textoDeUrl } from "@/lib/resolve-input";

describe("DOI en cualquiera de sus formas", () => {
  it.each([
    "10.1162/neco.1997.9.8.1735",
    "https://doi.org/10.1162/neco.1997.9.8.1735",
    "doi:10.1162/neco.1997.9.8.1735",
    "(doi: 10.1162/neco.1997.9.8.1735)",
  ])("reconoce %s", (entrada) => {
    expect(resolveInput(entrada)).toEqual({
      kind: "doi",
      doi: "10.1162/neco.1997.9.8.1735",
    });
  });
});

describe("DOI incrustado en la URL de una editorial", () => {
  // Casos reales: es la vía que cubre la mayoría de los enlaces.
  it.each([
    ["https://link.springer.com/article/10.1007/s11192-021-04026-6", "10.1007/s11192-021-04026-6"],
    ["https://dl.acm.org/doi/10.1145/3292500.3330701", "10.1145/3292500.3330701"],
    ["https://onlinelibrary.wiley.com/doi/10.1002/asi.24047", "10.1002/asi.24047"],
    [
      "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0000217",
      "10.1371/journal.pone.0000217",
    ],
  ])("extrae el DOI de %s", (url, esperado) => {
    expect(resolveInput(url)).toEqual({ kind: "doi", doi: esperado });
  });

  it("no se lleva por delante la query ni el fragmento", () => {
    expect(
      resolveInput("https://dl.acm.org/doi/10.1145/3292500.3330701?ref=x#abstract"),
    ).toEqual({ kind: "doi", doi: "10.1145/3292500.3330701" });
  });
});

describe("identificadores que necesitan una consulta", () => {
  it.each([
    "https://arxiv.org/abs/1706.03762",
    "https://arxiv.org/pdf/1706.03762",
    "arxiv:1706.03762",
  ])("reconoce arXiv en %s", (entrada) => {
    expect(resolveInput(entrada)).toEqual({ kind: "arxiv", id: "1706.03762" });
  });

  it("reconoce los identificadores antiguos de arXiv", () => {
    expect(resolveInput("https://arxiv.org/abs/cs/0605035")).toEqual({
      kind: "arxiv",
      id: "cs/0605035",
    });
  });

  it.each(["https://pubmed.ncbi.nlm.nih.gov/9377276/", "pmid:9377276"])(
    "reconoce PubMed en %s",
    (entrada) => {
      expect(resolveInput(entrada)).toEqual({ kind: "pmid", id: "9377276" });
    },
  );
});

describe("cuando no hay identificador", () => {
  it("un título se trata como búsqueda", () => {
    expect(resolveInput("Long Short-Term Memory")).toEqual({
      kind: "search",
      query: "Long Short-Term Memory",
    });
  });

  it("de una URL sin identificador saca el texto de la ruta", () => {
    // No se descarga la página: las editoriales grandes devuelven 403.
    const r = resolveInput(
      "https://www.nature.com/articles/deep-learning-in-neural-networks",
    );
    expect(r.kind).toBe("search");
    if (r.kind === "search") {
      expect(r.query).toBe("deep learning in neural networks");
    }
  });

  it("una entrada vacía no es una búsqueda", () => {
    expect(resolveInput("   ")).toEqual({ kind: "empty" });
  });
});

describe("texto buscable de una URL", () => {
  it("convierte los guiones del último segmento en espacios", () => {
    expect(
      textoDeUrl("https://example.org/journal/adaptive-learning-and-adhd"),
    ).toBe("adaptive learning and adhd");
  });

  it("quita la extensión del archivo", () => {
    expect(textoDeUrl("https://example.org/papers/memoria-a-largo-plazo.html")).toBe(
      "memoria a largo plazo",
    );
  });

  it("devuelve la URL entera si no hay nada aprovechable", () => {
    expect(textoDeUrl("https://example.org/a/b/c")).toBe(
      "https://example.org/a/b/c",
    );
  });
});

describe("DOI dentro de un PDF", () => {
  it("lo encuentra en la portada", () => {
    const texto =
      "Neural Computation 9(8):1735-1780\nhttps://doi.org/10.1162/neco.1997.9.8.1735\nSepp Hochreiter";
    expect(doiEnTextoDePdf(texto)).toBe("10.1162/neco.1997.9.8.1735");
  });

  it("solo mira el principio, no la bibliografía", () => {
    // El primer DOI de las referencias es el de OTRO artículo: tomarlo
    // significaría analizar un trabajo distinto del que se subió.
    const texto = "Portada sin DOI.\n" + "x".repeat(4000) + "\n10.9999/otro.articulo";
    expect(doiEnTextoDePdf(texto)).toBeNull();
  });

  it("devuelve null si no hay ninguno", () => {
    expect(doiEnTextoDePdf("Un texto cualquiera sin identificadores.")).toBeNull();
  });
});
