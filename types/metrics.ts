export type Quartile = "Q1" | "Q2" | "Q3" | "Q4";

/** Cuartil de una revista en una de sus categorias tematicas. */
export interface CategoryQuartile {
  category: string;
  quartile: Quartile;
}

/** Quien publica una metrica de revista. */
export type MetricSource = "scimago" | "openalex";

/**
 * Metricas de impacto de la REVISTA, no del articulo.
 *
 * Es una lista y no un objeto unico porque cada fuente publica cosas
 * distintas y para anios distintos: SCImago da cuartil y SJR, OpenAlex da
 * indice h y citas medias a dos anios. Mezclarlas en un solo registro
 * obligaria a elegir un `source` y un `year` para todas, que es justo lo que
 * el plan prohibe (§19: nunca mezclar metricas de anios distintos sin
 * indicarlo).
 *
 * Todos los valores son opcionales: si una fuente no publica una metrica, el
 * campo queda ausente y la interfaz lo dice. Nunca se estima.
 */
export interface PaperMetrics {
  /** Quien publica estas cifras. Obligatorio. */
  source: MetricSource;
  /** Anio al que corresponden. Obligatorio. */
  year: number;

  // --- SCImago ---
  quartile?: Quartile;
  /** Categoria en la que la revista alcanza su mejor cuartil. */
  quartileCategory?: string;
  /**
   * Cuartil en **cada** categoria, no solo el mejor.
   *
   * Importa enseñarlos todos. Caso real: Neural Computation es Q1 en "Arts
   * and Humanities (miscellaneous)" y Q2 en "Cognitive Neuroscience", que es
   * su area de verdad. Publicar solo "Q1" daria una idea equivocada en una
   * tesis, que es justo lo que el plan quiere evitar.
   */
  quartilesByCategory?: CategoryQuartile[];
  sjr?: number;

  // --- OpenAlex ---
  hIndex?: number;
  /**
   * Citas medias a dos anios.
   *
   * Es la misma formula que el Journal Impact Factor pero calculada sobre el
   * corpus de OpenAlex, asi que **no es** el JIF de Clarivate y no debe
   * etiquetarse como tal. Se muestra con su nombre propio.
   */
  twoYearMeanCitedness?: number;

  // --- Fuentes no integradas ---
  /** Scopus. Ninguna fuente integrada lo publica todavia. */
  citescore?: number;
  /** Journal Impact Factor de Clarivate. Tampoco esta integrado. */
  impactFactor?: number;
}

export const METRIC_SOURCE_LABELS: Record<MetricSource, string> = {
  scimago: "SCImago",
  openalex: "OpenAlex",
};

/** El cuartil solo lo publica SCImago; devuelve el primero que lo traiga. */
export function findQuartile(
  metrics: PaperMetrics[] | undefined,
): PaperMetrics | undefined {
  return metrics?.find((metric) => metric.quartile !== undefined);
}
