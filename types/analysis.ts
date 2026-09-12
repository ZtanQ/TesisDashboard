/**
 * Analisis generado por IA a partir de los datos del articulo.
 *
 * Todo lo que hay aqui es **informacion generada**, no dato obtenido, y la
 * interfaz debe marcarlo como tal (Plan.md §7). Se guarda separado de `Paper`
 * justamente para que no puedan confundirse.
 */

export type RelevanceLevel = "alta" | "media" | "baja";

/**
 * Valoracion de relevancia. Solo existe si el usuario declaro para que
 * investigacion pregunta.
 *
 * Sin un tema declarado, "relevancia" no significa nada: seria una opinion sin
 * criterio, que es exactamente la falsa metrica que el plan descarta (§18).
 * Por eso el tema forma parte del resultado: la valoracion no se entiende sin
 * el.
 */
export interface RelevanceAssessment {
  /** El tema tal como lo escribio el usuario. */
  researchTopic: string;
  level: RelevanceLevel;
  /** Por que, en una o dos frases, citando el contenido del articulo. */
  justification: string;
}

/**
 * Cada campo opcional es `null` cuando el texto analizado no lo dice.
 *
 * Es la regla del plan §17 llevada al tipo: si el articulo no declara el
 * tamano de muestra, aqui va `null` y la interfaz escribe "No especificada en
 * la informacion analizada". La IA no puede rellenarlo.
 */
export interface PaperAnalysis {
  summary: string;
  objective: string | null;
  problem: string | null;
  methodology: string | null;
  sample: string | null;
  dataset: string | null;
  mainFindings: string[];
  limitations: string[];
  topics: string[];
  relevance: RelevanceAssessment | null;

  /** Procedencia: que modelo lo genero, cuando, y sobre que texto. */
  generatedAt: string;
  model: string;
  /**
   * Que se le dio a leer. Importa porque sin el PDF (fase 8) el analisis se
   * basa solo en titulo, abstract y metadatos, y eso limita lo que puede
   * afirmar.
   */
  basedOn: "metadata" | "metadata+abstract" | "fulltext";
}
