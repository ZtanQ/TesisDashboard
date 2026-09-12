import type { DataSourceName } from "@/types/paper";

const LABELS: Record<DataSourceName, string> = {
  "semantic-scholar": "Semantic Scholar",
  openalex: "OpenAlex",
  crossref: "Crossref",
};

/**
 * Indica de donde viene un dato. La interfaz debe poder decir siempre si algo
 * fue obtenido de una fuente o generado por IA (Plan.md §7, invariante 1);
 * este es el extremo "obtenido".
 */
export function SourceBadge({ source }: { source: DataSourceName }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
      {LABELS[source]}
    </span>
  );
}
