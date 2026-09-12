import type { Paper } from "@/types/paper";
import { MetricCard } from "@/components/dashboard/metric-card";

/**
 * Cifras de cabecera. El cuartil solo aparece si una fuente lo publica, y
 * siempre acompanado de esa fuente y su anio (invariantes 3 y 4).
 */
export function MetricsGrid({ paper }: { paper: Paper }) {
  const { metrics } = paper;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MetricCard label="Año" value={paper.year} />
      <MetricCard label="Citas" value={paper.citationCount} />
      <MetricCard label="Referencias" value={paper.referenceCount} />
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
