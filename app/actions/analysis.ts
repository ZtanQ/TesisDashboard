"use server";

import { revalidatePath } from "next/cache";
import { normalizeDoi } from "@/lib/doi";
import { getPaperByDoi } from "@/lib/paper-service";
import { analyzePaper } from "@/lib/ai/paper-analysis";
import { saveAnalysis } from "@/lib/database/analyses";
import type { PaperAnalysis } from "@/types/analysis";

/**
 * Lanza el analisis por IA de un articulo.
 *
 * Es una accion explicita y no algo que ocurra al cargar la pagina: cada
 * analisis es una llamada de pago, y quien la paga decide cuando.
 */

export type AnalysisActionState = {
  status: "idle" | "done" | "error";
  analysis?: PaperAnalysis;
  message?: string;
};

const MENSAJES: Record<string, string> = {
  "not-configured":
    "El análisis por IA necesita una clave de API. Configura AI_API_KEY en .env.local.",
  "insufficient-text":
    "Este artículo no tiene abstract en las fuentes consultadas, así que no hay texto que interpretar. Analizarlo solo por el título produciría conjeturas.",
  refused: "El modelo declinó analizar este contenido.",
  failed: "No pudimos completar el análisis.",
};

export async function runAnalysis(
  _previous: AnalysisActionState,
  formData: FormData,
): Promise<AnalysisActionState> {
  const doi = normalizeDoi(String(formData.get("doi") ?? ""));
  if (!doi) return { status: "error", message: "DOI no válido." };

  const researchTopic = String(formData.get("researchTopic") ?? "").trim();

  const paper = await getPaperByDoi(doi);
  if (!paper.ok) {
    return {
      status: "error",
      message: "No pudimos recuperar el artículo para analizarlo.",
    };
  }

  const result = await analyzePaper(paper.paper, researchTopic || undefined);
  if (!result.ok) {
    return {
      status: "error",
      message: MENSAJES[result.error] ?? MENSAJES.failed,
    };
  }

  // Guardar es best-effort: si el artículo no está en la biblioteca o no hay
  // base de datos, el análisis se muestra igual, solo que no se conserva.
  await saveAnalysis(doi, result.analysis);

  revalidatePath(`/analyze/${encodeURIComponent(doi)}`);
  return { status: "done", analysis: result.analysis };
}
