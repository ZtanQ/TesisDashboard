import "server-only";
import type { PaperMetrics } from "@/types/metrics";
import type { Quartile } from "@/types/metrics";
import { normalizeIssn } from "@/lib/academic/scimago";
import { getSupabase, timedOut, withDeadline } from "@/lib/database/supabase";

/**
 * Consulta del ranking de SCImago importado.
 *
 * Es la unica fuente de cuartil y SJR del proyecto. Si nadie ha importado el
 * CSV, esto devuelve `null` y el cuartil sigue apareciendo como no disponible:
 * la aplicacion funciona igual.
 */

/**
 * Metricas de SCImago para una revista.
 *
 * Se busca el anio mas reciente disponible, pero se devuelve **el anio al que
 * corresponde el dato**, no el actual: un cuartil de 2023 mostrado como si
 * fuera de 2026 seria falsear la metrica (Plan.md §19).
 */
export async function findScimagoMetrics(
  issn: string | undefined,
): Promise<PaperMetrics | null> {
  if (!issn) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const normalizado = normalizeIssn(issn);
  if (normalizado.length !== 8) return null;

  const response = await withDeadline(
    supabase
      .from("scimago_journals")
      .select("year, sjr, quartile, quartile_category, h_index")
      .eq("issn", normalizado)
      .order("year", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );

  if (timedOut(response) || response.error || !response.data) return null;

  const fila = response.data as {
    year: number;
    sjr: number | null;
    quartile: string | null;
    quartile_category: string | null;
    h_index: number | null;
  };

  return {
    source: "scimago",
    year: fila.year,
    quartile: (fila.quartile ?? undefined) as Quartile | undefined,
    quartileCategory: fila.quartile_category ?? undefined,
    sjr: fila.sjr ?? undefined,
    hIndex: fila.h_index ?? undefined,
  };
}

/** Cuantas revistas hay importadas y de que anios. */
export async function scimagoCoverage(): Promise<{
  journals: number;
  years: number[];
} | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const response = await withDeadline(
    supabase.from("scimago_journals").select("year", { count: "exact" }),
  );
  if (timedOut(response) || response.error) return null;

  const filas = (response.data ?? []) as { year: number }[];
  return {
    journals: response.count ?? filas.length,
    years: [...new Set(filas.map((f) => f.year))].sort((a, b) => b - a),
  };
}
