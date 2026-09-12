import type { Paper } from "@/types/paper";
import type { PaperErrorCode } from "@/lib/errors";
import { normalizeDoi } from "@/lib/doi";
import { fetchPaperByDoi } from "@/lib/academic/semantic-scholar";
import { normalizeSemanticScholarPaper } from "@/lib/normalization/semantic-scholar";

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
 * Hoy consulta solo Semantic Scholar. Cuando se anada OpenAlex (fase 5), este
 * es el lugar donde se consultan varias fuentes y se combinan sus resultados;
 * ni las paginas ni los componentes se enteran.
 */
export async function getPaperByDoi(input: string): Promise<PaperResult> {
  const doi = normalizeDoi(input);
  if (!doi) return { ok: false, error: "invalid-doi" };

  const result = await fetchPaperByDoi(doi);

  if (!result.ok) {
    if (result.error === "not-found") return { ok: false, error: "not-found" };
    if (result.error === "rate-limited") {
      return { ok: false, error: "rate-limited" };
    }
    return { ok: false, error: "source-unavailable" };
  }

  return { ok: true, paper: normalizeSemanticScholarPaper(result.paper, doi) };
}
