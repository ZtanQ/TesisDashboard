import type { Bucket } from "@/lib/statistics";
import { Unavailable } from "@/components/ui/unavailable";

/**
 * Serie temporal de articulos por anio, en columnas sobre un eje horizontal.
 *
 * Es la forma correcta para el tiempo, y no una lista de barras horizontales:
 * una biblioteca que abarque veinte anios son veinte filas, la mayoria vacias,
 * y el patron se pierde. En columnas, un anio sin articulos es un hueco que se
 * ve de un vistazo y ocupa lo mismo que cualquier otro.
 *
 * Los anios sin articulos siguen presentes a proposito: omitirlos comprimiria
 * el eje y haria parecer consecutivos anios que distan dos decadas.
 *
 * Una sola serie: la altura codifica la magnitud y el color no codifica nada.
 * Se etiquetan solo las columnas con valor, no todas, para que la cifra no
 * compita con la forma.
 */
export function YearColumns({
  data,
  emptyMessage,
}: {
  data: Bucket[];
  emptyMessage: string;
}) {
  if (data.length === 0) return <Unavailable>{emptyMessage}</Unavailable>;

  const max = Math.max(...data.map((bucket) => bucket.count));
  // Con muchos anios, etiquetar todos amontona el eje: se rotulan el primero,
  // el ultimo y uno de cada N.
  const paso = data.length <= 12 ? 1 : Math.ceil(data.length / 8);

  return (
    <div className="w-full min-w-0 overflow-x-auto">
      {/* items-stretch: cada columna ocupa toda la altura, que es contra lo
          que se resuelve el porcentaje de altura de la barra. */}
      <div
        className="flex min-w-[18rem] items-stretch gap-[2px]"
        style={{ height: "9rem" }}
      >
        {data.map((bucket) => (
          <div
            key={bucket.label}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
            title={`${bucket.label}: ${bucket.count}`}
          >
            {bucket.count > 0 ? (
              <span className="mb-1 text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                {bucket.count}
              </span>
            ) : null}
            <span
              className="w-full rounded-t-[4px] bg-[#2a78d6] dark:bg-[#3987e5]"
              style={{
                // Los años a cero dejan una línea tenue: el hueco se ve, pero
                // no se confunde con una columna de valor 1.
                height: bucket.count === 0 ? "2px" : `${(bucket.count / max) * 100}%`,
                opacity: bucket.count === 0 ? 0.18 : 1,
              }}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex min-w-[18rem] gap-[2px]">
        {data.map((bucket, indice) => {
          const rotular =
            indice === 0 || indice === data.length - 1 || indice % paso === 0;
          return (
            <span
              key={bucket.label}
              className="min-w-0 flex-1 text-center text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500"
            >
              {rotular ? bucket.label.slice(2) : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}
