/**
 * Nombre legible de un codigo ISO 3166-1 alfa-2.
 *
 * Se usa `Intl.DisplayNames` en vez de mantener una tabla propia: viene con la
 * plataforma y se traduce solo. Si el codigo no se reconoce, se devuelve tal
 * cual en lugar de descartarlo.
 */
export function countryName(code: string, locale = "es"): string {
  try {
    const display = new Intl.DisplayNames([locale], { type: "region" });
    return display.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
