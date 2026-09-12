import type { PaperMetrics } from "@/types/metrics";
import { METRIC_SOURCE_LABELS } from "@/types/metrics";
import { Unavailable } from "@/components/ui/unavailable";

/**
 * Metricas de la revista, agrupadas por la fuente que las publica.
 *
 * Cada bloque lleva su fuente y su anio porque una metrica sin procedencia no
 * es interpretable (Plan.md §19), y porque estas cifras vienen de sitios
 * distintos y no son intercambiables.
 */

function Fila({
  label,
  value,
  note,
}: {
  label: string;
  value: string | undefined;
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-900">
      <dt className="w-52 shrink-0 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="text-sm text-zinc-900 dark:text-zinc-100">
        {value ?? <Unavailable />}
        {value && note ? (
          <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">
            {note}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

function numero(valor: number | undefined, decimales = 2): string | undefined {
  return valor === undefined
    ? undefined
    : valor.toLocaleString("es", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
      });
}

export function JournalMetrics({
  metrics,
  venue,
}: {
  metrics: PaperMetrics[] | undefined;
  venue: string | undefined;
}) {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="max-w-prose space-y-2">
        <Unavailable>
          Ninguna fuente publica métricas de esta revista.
        </Unavailable>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          El cuartil y el SJR los publica SCImago, cuyo ranking hay que importar
          a mano (<code className="font-mono">npm run import:scimago</code>). El
          índice h y las citas medias los aporta OpenAlex, que no siempre tiene
          ficha de la revista.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {venue ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Cifras de <strong className="font-medium">{venue}</strong>, no de este
          artículo.
        </p>
      ) : null}

      {metrics.map((metric) => (
        <div key={`${metric.source}-${metric.year}`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            {METRIC_SOURCE_LABELS[metric.source]} · {metric.year}
          </p>
          <dl className="mt-2">
            {metric.source === "scimago" ? (
              <>
                {metric.quartilesByCategory &&
                metric.quartilesByCategory.length > 0 ? (
                  <div className="border-b border-zinc-100 py-2 dark:border-zinc-900">
                    <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Cuartil por categoría
                    </dt>
                    <dd className="mt-1 space-y-1">
                      {metric.quartilesByCategory.map((entrada) => (
                        <div
                          key={entrada.category}
                          className="flex flex-wrap items-baseline gap-x-3 text-sm"
                        >
                          <span className="w-8 shrink-0 font-semibold text-zinc-900 dark:text-zinc-100">
                            {entrada.quartile}
                          </span>
                          <span className="text-zinc-600 dark:text-zinc-300">
                            {entrada.category}
                          </span>
                        </div>
                      ))}
                      {metric.quartilesByCategory.length > 1 ? (
                        <p className="max-w-prose pt-1 text-xs text-zinc-400 dark:text-zinc-500">
                          SCImago resume esta revista como{" "}
                          <strong className="font-medium">
                            {metric.quartile}
                          </strong>
                          , que es su mejor cuartil. Mira la categoría que
                          corresponda a tu área antes de citarlo.
                        </p>
                      ) : null}
                    </dd>
                  </div>
                ) : (
                  <Fila
                    label="Cuartil"
                    value={metric.quartile}
                    note={
                      metric.quartileCategory
                        ? `en ${metric.quartileCategory}`
                        : undefined
                    }
                  />
                )}
                <Fila label="SJR" value={numero(metric.sjr, 3)} />
                <Fila
                  label="Índice h"
                  value={
                    metric.hIndex === undefined
                      ? undefined
                      : String(metric.hIndex)
                  }
                />
              </>
            ) : (
              <>
                <Fila
                  label="Índice h"
                  value={
                    metric.hIndex === undefined
                      ? undefined
                      : String(metric.hIndex)
                  }
                />
                <Fila
                  label="Citas medias a 2 años"
                  value={numero(metric.twoYearMeanCitedness)}
                  note="misma fórmula que el JIF, pero sobre OpenAlex"
                />
              </>
            )}
          </dl>
        </div>
      ))}

      <p className="max-w-prose text-xs text-zinc-400 dark:text-zinc-500">
        El CiteScore (Scopus) y el Journal Impact Factor (Clarivate) requieren
        suscripción y no están integrados, así que no aparecen aquí.
      </p>
    </div>
  );
}
