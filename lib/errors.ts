/**
 * Fallos previstos al resolver un articulo. Se modelan como valores de retorno
 * y no como excepciones: un DOI que no existe es un resultado normal, no un
 * error de programa (Plan.md §26).
 */
export type PaperErrorCode =
  | "invalid-doi"
  | "not-found"
  | "source-unavailable";

export const PAPER_ERROR_MESSAGES: Record<
  PaperErrorCode,
  { title: string; detail: string }
> = {
  "invalid-doi": {
    title: "No pudimos identificar un artículo con ese DOI.",
    detail:
      "Revisa que el identificador tenga la forma 10.xxxx/xxxxx. También puedes pegar la URL completa de doi.org.",
  },
  "not-found": {
    title: "No encontramos información suficiente.",
    detail:
      "El DOI es válido, pero ninguna fuente consultada tiene datos de este artículo. Prueba con el título.",
  },
  "source-unavailable": {
    title: "La fuente académica no está disponible.",
    detail: "No pudimos contactar con el servicio. Inténtalo nuevamente.",
  },
};
