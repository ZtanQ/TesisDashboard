import type { Bucket } from "@/lib/statistics";
import { Unavailable } from "@/components/ui/unavailable";

/**
 * Barras horizontales para comparar magnitudes.
 *
 * Una sola serie: la longitud codifica la magnitud y el color no codifica
 * nada, por eso todas las barras comparten el mismo azul en vez de usar un
 * color por categoria. Cada barra lleva su etiqueta y su valor, asi que la
 * identidad nunca depende del color.
 *
 * Las barras a cero se dibujan igualmente como pista visible: en la serie por
 * anio, un anio sin articulos es informacion, no un hueco que tapar.
 */
export function RankedBars({
  data,
  emptyMessage,
  labelWidth = "10rem",
}: {
  data: Bucket[];
  emptyMessage: string;
  /** Ancho de la columna de etiquetas; mas ancho para nombres largos. */
  labelWidth?: string;
}) {
  if (data.length === 0) return <Unavailable>{emptyMessage}</Unavailable>;

  const max = Math.max(...data.map((bucket) => bucket.count));

  return (
    <ul className="space-y-2">
      {data.map((bucket) => (
        <li
          key={bucket.label}
          className="grid items-center gap-3"
          style={{ gridTemplateColumns: `${labelWidth} 1fr 3rem` }}
        >
          <span
            className="truncate text-sm text-zinc-700 dark:text-zinc-300"
            title={bucket.label}
          >
            {bucket.label}
          </span>
          <span className="h-2.5 w-full rounded-[4px] bg-zinc-100 dark:bg-zinc-800">
            <span
              className="block h-full rounded-r-[4px] bg-[#2a78d6] dark:bg-[#3987e5]"
              style={{
                width: max === 0 ? "0%" : `${(bucket.count / max) * 100}%`,
              }}
            />
          </span>
          <span className="text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
            {bucket.count}
          </span>
        </li>
      ))}
    </ul>
  );
}
