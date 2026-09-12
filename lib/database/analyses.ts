import "server-only";
import type { PaperAnalysis } from "@/types/analysis";
import { getSupabase, timedOut, withDeadline } from "@/lib/database/supabase";
import type { DbResult } from "@/lib/database/papers";

/**
 * Persistencia de los analisis generados por IA.
 *
 * Se guardan porque cuestan dinero: sin esto, cada visita al dashboard
 * volveria a pagar el mismo analisis. Solo se guardan de articulos que ya
 * estan en la biblioteca, que es donde tiene sentido conservarlos.
 *
 * La clave es (articulo, tema de investigacion): el mismo articulo analizado
 * para dos tesis distintas son dos analisis distintos, porque la relevancia
 * cambia.
 */

const TIMEOUT_DETAIL = "La base de datos no respondió a tiempo.";

function fail(detail?: string): DbResult<never> {
  return { ok: false, error: "failed", detail };
}

/** Id interno del articulo a partir de su DOI. */
async function paperIdFor(doi: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const response = await withDeadline(
    supabase.from("papers").select("id").eq("doi", doi).maybeSingle(),
  );
  if (timedOut(response) || response.error) return null;
  return (response.data?.id as string) ?? null;
}

export async function saveAnalysis(
  doi: string,
  analysis: PaperAnalysis,
): Promise<DbResult<null>> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "not-configured" };

  const paperId = await paperIdFor(doi);
  // Un analisis de un articulo que no esta guardado no se persiste: no es un
  // error, simplemente no hay donde colgarlo.
  if (!paperId) return { ok: false, error: "not-configured" };

  const response = await withDeadline(
    supabase.from("ai_analyses").upsert(
      {
        paper_id: paperId,
        research_topic: analysis.relevance?.researchTopic ?? "",
        model: analysis.model,
        based_on: analysis.basedOn,
        payload: analysis,
        generated_at: analysis.generatedAt,
      },
      { onConflict: "paper_id,research_topic" },
    ),
  );

  if (timedOut(response)) return fail(TIMEOUT_DETAIL);
  if (response.error) return fail(response.error.message);
  return { ok: true, data: null };
}

/** Recupera un analisis guardado. `data: null` significa que no hay ninguno. */
export async function getSavedAnalysis(
  doi: string,
  researchTopic = "",
): Promise<DbResult<PaperAnalysis | null>> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "not-configured" };

  const paperId = await paperIdFor(doi);
  if (!paperId) return { ok: true, data: null };

  const response = await withDeadline(
    supabase
      .from("ai_analyses")
      .select("payload")
      .eq("paper_id", paperId)
      .eq("research_topic", researchTopic.trim())
      .maybeSingle(),
  );

  if (timedOut(response)) return fail(TIMEOUT_DETAIL);
  if (response.error) return fail(response.error.message);
  if (!response.data) return { ok: true, data: null };

  return { ok: true, data: response.data.payload as PaperAnalysis };
}

export async function deleteAnalyses(doi: string): Promise<DbResult<null>> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "not-configured" };

  const paperId = await paperIdFor(doi);
  if (!paperId) return { ok: true, data: null };

  const response = await withDeadline(
    supabase.from("ai_analyses").delete().eq("paper_id", paperId),
  );
  if (timedOut(response)) return fail(TIMEOUT_DETAIL);
  if (response.error) return fail(response.error.message);
  return { ok: true, data: null };
}
