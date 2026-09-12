/**
 * DOIs reales que se ofrecen en la portada para probar la aplicacion.
 * Verificados contra Semantic Scholar; cubren revista, congreso y acceso
 * abierto.
 */
export const EXAMPLE_DOIS = [
  {
    doi: "10.1162/neco.1997.9.8.1735",
    label: "Long Short-Term Memory",
    note: "Artículo de revista, muy citado",
  },
  {
    doi: "10.1145/3292500.3330701",
    label: "Optuna",
    note: "Ponencia de congreso",
  },
  {
    doi: "10.1371/journal.pone.0000217",
    label: "PLOS ONE",
    note: "Acceso abierto",
  },
] as const;
