import type { Paper } from "@/types/paper";
import type { PaperErrorCode } from "@/lib/errors";
import { normalizeDoi } from "@/lib/doi";
import { MOCK_ERROR_DOIS, MOCK_PAPERS } from "@/lib/mock/papers";

/**
 * Resultado de resolver un articulo. Union discriminada: quien la consume esta
 * obligado por el compilador a contemplar el fallo.
 */
export type PaperResult =
  | { ok: true; paper: Paper }
  | { ok: false; error: PaperErrorCode };

/**
 * Punto unico por el que la interfaz obtiene un articulo (Plan.md §25).
 *
 * FASE 1: devuelve datos de ejemplo desde `lib/mock/papers`.
 * FASE 2: el cuerpo pasa a delegar en el proveedor academico
 *         (`lib/academic/semantic-scholar`) y su normalizador. La firma no
 *         cambia, de modo que ninguna pagina ni componente se toca.
 */
export async function getPaperByDoi(input: string): Promise<PaperResult> {
  const doi = normalizeDoi(input);
  if (!doi) return { ok: false, error: "invalid-doi" };

  if (doi === MOCK_ERROR_DOIS.sourceUnavailable) {
    return { ok: false, error: "source-unavailable" };
  }

  const paper = MOCK_PAPERS.find((candidate) => candidate.doi === doi);
  if (!paper) return { ok: false, error: "not-found" };

  return { ok: true, paper };
}
