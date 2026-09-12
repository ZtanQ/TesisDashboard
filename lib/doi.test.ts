import { describe, expect, it } from "vitest";
import { encodeDoiForUrl, isValidDoi, normalizeDoi } from "@/lib/doi";

describe("normalizeDoi", () => {
  it("acepta un DOI pelado", () => {
    expect(normalizeDoi("10.1162/neco.1997.9.8.1735")).toBe(
      "10.1162/neco.1997.9.8.1735",
    );
  });

  it("pasa a minúsculas: la especificación los define insensibles a mayúsculas", () => {
    // Asi dos entradas del mismo articulo colisionan en el mismo registro.
    expect(normalizeDoi("10.1162/NECO.1997")).toBe("10.1162/neco.1997");
  });

  it.each([
    ["https://doi.org/10.1000/xyz", "10.1000/xyz"],
    ["http://doi.org/10.1000/xyz", "10.1000/xyz"],
    ["https://dx.doi.org/10.1000/xyz", "10.1000/xyz"],
    ["doi:10.1000/xyz", "10.1000/xyz"],
    ["  10.1000/xyz  ", "10.1000/xyz"],
  ])("extrae el DOI de %s", (entrada, esperado) => {
    expect(normalizeDoi(entrada)).toBe(esperado);
  });

  it("descarta query string y fragmento de una URL de resolvedor", () => {
    expect(normalizeDoi("https://doi.org/10.1000/xyz?utm_source=x")).toBe(
      "10.1000/xyz",
    );
    expect(normalizeDoi("https://doi.org/10.1000/xyz#seccion")).toBe(
      "10.1000/xyz",
    );
  });

  it.each([
    "10.1000/xyz.",
    "(10.1000/xyz)",
    "[10.1000/xyz]",
    '"10.1000/xyz"',
    "(doi: 10.1000/xyz)",
    "10.1000/xyz;",
  ])("quita la puntuación que se arrastra al copiar y pegar: %s", (entrada) => {
    expect(normalizeDoi(entrada)).toBe("10.1000/xyz");
  });

  it.each([
    ["", "cadena vacía"],
    ["   ", "solo espacios"],
    ["no es un doi", "texto libre"],
    ["11.1000/xyz", "no empieza por 10."],
    ["10.1/xyz", "prefijo demasiado corto"],
    ["10.1000", "sin sufijo"],
    ["10.1000/", "sufijo vacío"],
  ])("rechaza %s (%s)", (entrada) => {
    expect(normalizeDoi(entrada)).toBeNull();
    expect(isValidDoi(entrada)).toBe(false);
  });

  it("acepta sufijos con caracteres poco habituales", () => {
    // Los sufijos no estan normalizados: rechazar de mas dejaria fuera
    // articulos reales.
    expect(normalizeDoi("10.1371/journal.pone.0000217")).toBe(
      "10.1371/journal.pone.0000217",
    );
    expect(normalizeDoi("10.48550/arXiv.1706.03762")).toBe(
      "10.48550/arxiv.1706.03762",
    );
  });
});

describe("encodeDoiForUrl", () => {
  it("codifica la barra para que el DOI quepa en un segmento de ruta", () => {
    expect(encodeDoiForUrl("10.1000/xyz")).toBe("10.1000%2Fxyz");
  });

  it("sobrevive a la ida y vuelta por la URL", () => {
    const doi = "10.1371/journal.pone.0000217";
    expect(decodeURIComponent(encodeDoiForUrl(doi))).toBe(doi);
  });
});
