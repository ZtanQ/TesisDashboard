import { describe, expect, it } from "vitest";
import { detectarSecciones, textoParaAnalisis } from "@/lib/pdf/sections";

describe("detección de encabezados", () => {
  it("reconoce las secciones habituales en inglés", () => {
    const secciones = detectarSecciones(
      [
        "Abstract",
        "Resumen del trabajo.",
        "1 Introduction",
        "Contexto del problema.",
        "3 Methods",
        "Diseño del estudio.",
        "5 Results",
        "Lo que se obtuvo.",
        "6 Discussion",
        "Interpretación.",
        "7 Conclusion",
        "Cierre.",
        "References",
        "[1] Autor, Año.",
      ].join("\n"),
    );

    expect(secciones.map((s) => s.kind)).toEqual([
      "abstract",
      "introduction",
      "methodology",
      "results",
      "discussion",
      "conclusion",
      "references",
    ]);
  });

  it("reconoce las secciones en español", () => {
    const secciones = detectarSecciones(
      [
        "Resumen",
        "Texto del resumen.",
        "1. Introducción",
        "Contexto.",
        "2. Metodología",
        "Diseño.",
        "3. Resultados",
        "Hallazgos.",
        "4. Limitaciones",
        "Lo que no cubre.",
        "Bibliografía",
        "Referencias varias.",
      ].join("\n"),
    );

    expect(secciones.map((s) => s.kind)).toEqual([
      "abstract",
      "introduction",
      "methodology",
      "results",
      "limitations",
      "references",
    ]);
  });

  it("limitaciones gana a discusión cuando ambas podrían encajar", () => {
    const [seccion] = detectarSecciones("Limitations and discussion\nTexto.");
    expect(seccion.kind).toBe("limitations");
  });

  it("corta también en encabezados numerados que no reconoce por nombre", () => {
    // Sin esto, "2 Background" se tragaba las secciones 3, 4 y 5 enteras.
    const secciones = detectarSecciones(
      [
        "2 Background",
        "Contexto.",
        "3 Model Architecture",
        "Descripción del modelo.",
        "4 Why Self-Attention",
        "Justificación.",
      ].join("\n"),
    );

    expect(secciones.map((s) => s.heading)).toEqual([
      "2 Background",
      "3 Model Architecture",
      "4 Why Self-Attention",
    ]);
  });

  it("no toma por encabezado una frase que menciona la palabra de paso", () => {
    const secciones = detectarSecciones(
      "En la sección de resultados mostramos que el método mejora la línea base y supera al anterior.",
    );
    expect(secciones).toHaveLength(1);
    expect(secciones[0].kind).toBe("other");
  });

  it("conserva el texto anterior al primer encabezado", () => {
    const secciones = detectarSecciones(
      "Título del artículo\nAutores y filiaciones\nAbstract\nEl resumen.",
    );
    expect(secciones[0].kind).toBe("other");
    expect(secciones[0].text).toContain("Autores");
    expect(secciones[1].kind).toBe("abstract");
  });

  it("devuelve una sola sección cuando no reconoce estructura", () => {
    // Honesto: sin encabezados, el texto entero sigue siendo útil.
    const secciones = detectarSecciones("Un texto corrido sin ninguna estructura.");
    expect(secciones).toHaveLength(1);
    expect(secciones[0].kind).toBe("other");
  });

  it("conserva un encabezado sin cuerpo propio", () => {
    // "6 Results" seguido de "6.1 ..." sitúa lo que viene después.
    const secciones = detectarSecciones(
      "6 Results\n6.1 Machine Translation\nDatos del experimento.",
    );
    expect(secciones.map((s) => s.heading)).toEqual([
      "6 Results",
      "6.1 Machine Translation",
    ]);
  });
});

describe("texto para el modelo", () => {
  const secciones = detectarSecciones(
    [
      "Abstract",
      "Resumen.",
      "1 Introduction",
      "Contexto.",
      "References",
      "[1] Una referencia muy larga que ocupa espacio sin aportar interpretación.",
    ].join("\n"),
  );

  it("excluye la bibliografía", () => {
    const texto = textoParaAnalisis(secciones);
    expect(texto).toContain("Resumen.");
    expect(texto).not.toContain("Una referencia muy larga");
  });

  it("etiqueta cada sección con su encabezado", () => {
    expect(textoParaAnalisis(secciones)).toContain("## 1 Introduction");
  });

  it("recorta y lo dice cuando supera el límite", () => {
    const texto = textoParaAnalisis(secciones, 40);
    expect(texto).toContain("[Texto recortado a 40 caracteres.]");
  });
});
