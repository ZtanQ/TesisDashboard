export type Quartile = "Q1" | "Q2" | "Q3" | "Q4";

/**
 * Metricas de impacto de la REVISTA, no del articulo.
 *
 * Todos los campos son opcionales a proposito: si una fuente no publica una
 * metrica, el campo queda ausente y la interfaz lo indica. Nunca se estima.
 * `source` y `year` son obligatorios porque una metrica sin procedencia ni
 * anio no es interpretable (Plan.md, invariante 3).
 */
export interface PaperMetrics {
  quartile?: Quartile;
  sjr?: number;
  citescore?: number;
  impactFactor?: number;
  /** Quien publica la metrica, p. ej. "SCImago". */
  source: string;
  /** Anio al que corresponde la metrica. */
  year: number;
}
