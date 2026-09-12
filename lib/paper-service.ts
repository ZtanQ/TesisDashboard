import type { Paper } from "@/types/paper";
import type { PaperErrorCode } from "@/lib/errors";
import { normalizeDoi } from "@/lib/doi";
import { fetchPaperByDoi } from "@/lib/academic/semantic-scholar";
import { fetchSourceByIssn, fetchWorkByDoi } from "@/lib/academic/openalex";
import { normalizeSemanticScholarPaper } from "@/lib/normalization/semantic-scholar";
import { normalizeOpenAlexWork } from "@/lib/normalization/openalex";
import { mergePapers } from "@/lib/normalization/merge";
import type { PaperMetrics } from "@/types/metrics";
import { findScimagoMetrics } from "@/lib/database/journal-metrics";

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
 * Consulta las dos fuentes en paralelo y basta con que una responda: hay DOIs
 * que solo estan en una de ellas (10.1038/nature14539 existe en OpenAlex y no
 * en Semantic Scholar), asi que consultar ambas amplia la cobertura ademas de
 * enriquecer los datos.
 */
/**
 * Metricas de la revista, de las dos fuentes que publican algo.
 *
 * OpenAlex da indice h y citas medias a dos anios; SCImago, cuartil y SJR.
 * Son cosas distintas, asi que se conservan ambas con su procedencia en lugar
 * de elegir una. Los fallos se ignoran: sin metricas de revista el articulo se
 * muestra igual, solo que esas casillas dicen que no hay dato.
 */
async function journalMetrics(issn: string | undefined): Promise<PaperMetrics[]> {
  if (!issn) return [];

  const [openAlex, scimago] = await Promise.all([
    fetchSourceByIssn(issn),
    findScimagoMetrics(issn),
  ]);

  const metricas: PaperMetrics[] = [];

  if (openAlex.ok) {
    const stats = openAlex.source.summary_stats;
    const hIndex = stats?.h_index ?? undefined;
    const citedness = stats?.["2yr_mean_citedness"] ?? undefined;

    if (hIndex !== undefined || citedness !== undefined) {
      metricas.push({
        source: "openalex",
        // OpenAlex publica estas cifras sin fechar; corresponden al estado
        // actual de su corpus, asi que se fechan en el anio en curso.
        year: new Date().getFullYear(),
        hIndex: hIndex ?? undefined,
        twoYearMeanCitedness: citedness ?? undefined,
      });
    }
  }

  if (scimago) metricas.push(scimago);

  return metricas;
}

export async function getPaperByDoi(input: string): Promise<PaperResult> {
  const doi = normalizeDoi(input);
  if (!doi) return { ok: false, error: "invalid-doi" };

  const [openAlex, semanticScholar] = await Promise.all([
    fetchWorkByDoi(doi),
    fetchPaperByDoi(doi),
  ]);

  const fromOpenAlex = openAlex.ok
    ? normalizeOpenAlexWork(openAlex.work, doi)
    : null;
  const fromSemanticScholar = semanticScholar.ok
    ? normalizeSemanticScholarPaper(semanticScholar.paper, doi)
    : null;

  // OpenAlex va primero porque es el mas completo en lo estructural
  // (instituciones, paises, topicos, nombres); Semantic Scholar rellena lo
  // que le falta, sobre todo el venue y el titulo cuando OpenAlex lo trunca.
  const fusionado =
    fromOpenAlex && fromSemanticScholar
      ? mergePapers(fromOpenAlex, fromSemanticScholar)
      : (fromOpenAlex ?? fromSemanticScholar);

  if (fusionado) {
    const metrics = await journalMetrics(fusionado.venueIssn);
    return {
      ok: true,
      paper: metrics.length > 0 ? { ...fusionado, metrics } : fusionado,
    };
  }

  // Ninguna respondio: el motivo mas informativo manda. Que una fuente no
  // tenga el articulo es menos grave que no haber podido preguntar.
  const errors = [openAlex, semanticScholar]
    .filter((result) => !result.ok)
    .map((result) => (result as { error: string }).error);

  if (errors.includes("unavailable")) {
    return { ok: false, error: "source-unavailable" };
  }
  if (errors.includes("rate-limited")) {
    return { ok: false, error: "rate-limited" };
  }
  return { ok: false, error: "not-found" };
}
