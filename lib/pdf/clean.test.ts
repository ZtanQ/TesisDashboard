import { describe, expect, it } from "vitest";
import { limpiarTextoPdf, unirPalabraCortada } from "@/lib/pdf/clean";

describe("palabras cortadas a final de línea", () => {
  // Casos reales de un artículo: los guiones de partición y los guiones
  // legítimos son indistinguibles por su forma, así que se resuelven
  // buscando cuál de las dos formas aparece en otro punto del documento.
  it("une la palabra cuando la forma sin guion aparece en el documento", () => {
    const doc = "El modelo de transduction usa transduc-\ntion neuronal.";
    expect(unirPalabraCortada("transduc", "tion", doc)).toBe("transduction");
  });

  it("conserva el guion cuando la forma con guion aparece en el documento", () => {
    const doc = "English-to-German y también English-\nto-German.";
    expect(unirPalabraCortada("English", "to", doc)).toBe("English-to");
  });

  it("conserva el guion cuando no hay evidencia de ninguna forma", () => {
    // Es el fallo benigno elegido: "sur-prisingly" se lee; "sequencealigned"
    // quedaría corrompido.
    expect(unirPalabraCortada("sequence", "aligned", "texto sin pistas")).toBe(
      "sequence-aligned",
    );
  });

  it("aplica la decisión sobre el texto completo", () => {
    const crudo =
      "Usamos convolutional nets.\nLa capa convolu-\ntional es clave.\nEl modelo English-\nto-German mejora English-to-German.";
    const limpio = limpiarTextoPdf(crudo);

    expect(limpio).toContain("convolutional es clave");
    expect(limpio).toContain("English-to-German");
    expect(limpio).not.toContain("convolu-tional");
    expect(limpio).not.toContain("Englishto");
  });
});

describe("artefactos de maquetación", () => {
  it("quita las líneas que solo son un número de página", () => {
    const limpio = limpiarTextoPdf("Primera línea.\n7\nSegunda línea.");
    expect(limpio).toBe("Primera línea.\nSegunda línea.");
  });

  it("no confunde un dato numérico con un folio", () => {
    // Una línea con más que el número se conserva.
    expect(limpiarTextoPdf("Resultado.\nn = 214\nFin.")).toContain("n = 214");
  });

  it("expande las ligaduras tipográficas", () => {
    expect(limpiarTextoPdf("La deﬁnición es eﬁcaz y ﬂuida en el análisis.")).toContain(
      "definición es eficaz y fluida",
    );
  });

  it("une las líneas partidas a mitad de frase", () => {
    const limpio = limpiarTextoPdf(
      "El modelo propuesto mejora\nlos resultados anteriores.",
    );
    expect(limpio).toBe("El modelo propuesto mejora los resultados anteriores.");
  });

  it("no une una línea nueva que empieza en mayúscula", () => {
    // Así los encabezados conservan su propia línea y siguen siendo detectables.
    const limpio = limpiarTextoPdf("Texto previo sin punto\n3 Model Architecture");
    expect(limpio.split("\n")).toHaveLength(2);
  });

  it("no une cuando la línea anterior termina la frase", () => {
    const limpio = limpiarTextoPdf("Termina aquí.\nempieza otra");
    expect(limpio.split("\n")).toHaveLength(2);
  });

  it("colapsa espacios repetidos y saltos sobrantes", () => {
    expect(limpiarTextoPdf("Hola    mundo.\n\n\n\nAdiós.")).toBe(
      "Hola mundo.\n\nAdiós.",
    );
  });
});
