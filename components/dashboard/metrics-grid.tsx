import type { Paper, SourcedCount } from "@/types/paper";
import { MetricCard } from "@/components/dashboard/metric-card";
import { formatNumber } from "@/lib/format";

const SOURCE_LABELS: Record<string, string> = {
  "semantic-scholar": "Semantic Scholar",
  openalex: "OpenAlex",
  crossref: "Crossref",
};

/**
 * Nota al pie de un recuento.
 *
 * Con una sola fuente, la nombra. Con varias que coinciden, tambien. Cuando
 * discrepan —lo normal entre Semantic Scholar y OpenAlex, que indexan corpus
 * distintos— se enseñan las dos cifras en vez de elegir una en silencio.
 */
function countFootnote(counts?: SourcedCount[]): string | undefined {
  if (!counts || counts.length === 0) return undefined;

  const values = new Set(counts.map((entry) => entry.count));
  if (values.size === 1) {
    return counts.map((entry) => SOURCE_LABELS[entry.source]).join(" · ");
  }

  return counts
    .map(
      (entry) =>
        `${formatNumber(entry.count)} ${SOURCE_LABELS[entry.source]}`,
    )
    .join(" · ");
}

/**
 * Cifras de cabecera. El cuartil solo aparece si una fuente lo publica, y
 * siempre acompanado de esa fuente y su anio (invariantes 3 y 4).
 */
export function MetricsGrid({ paper }: { paper: Paper }) {
  const { metrics } = paper;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MetricCard label="Año" value={paper.year} />
      <MetricCard
        label="Citas"
        value={
          paper.citationCount === undefined
            ? undefined
            : formatNumber(paper.citationCount)
        }
        footnote={countFootnote(paper.citationCounts)}
      />
      <MetricCard
        label="Referencias"
        value={
          paper.referenceCount === undefined
            ? undefined
            : formatNumber(paper.referenceCount)
        }
        footnote={countFootnote(paper.referenceCounts)}
      />
      <MetricCard
        label="Cuartil"
        value={metrics?.quartile}
        footnote={
          metrics?.quartile
            ? `${metrics.source} · ${metrics.year}`
            : "Ninguna fuente lo publica"
        }
      />
    </div>
  );
}
