import { Unavailable } from "@/components/ui/unavailable";

export function MetricCard({
  label,
  value,
  footnote,
}: {
  label: string;
  /** `undefined` o `null` se renderizan como no disponible, nunca como 0. */
  value?: string | number | null;
  footnote?: string;
}) {
  const hasValue = value !== undefined && value !== null && value !== "";

  return (
    <div className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <div className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
        {hasValue ? value : <Unavailable>—</Unavailable>}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      {footnote ? (
        <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
          {footnote}
        </div>
      ) : null}
    </div>
  );
}
