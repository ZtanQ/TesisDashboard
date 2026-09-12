import type { Author } from "@/types/author";
import { countryName } from "@/lib/countries";
import { Unavailable } from "@/components/ui/unavailable";

/**
 * Autores por pais, en barras horizontales ordenadas de mayor a menor.
 *
 * Una sola serie: la longitud codifica la magnitud y el color no codifica
 * nada, por eso todas las barras comparten el mismo azul en lugar de usar un
 * color por pais. Cada barra lleva su etiqueta y su valor, asi que la
 * identidad nunca depende del color.
 *
 * El plan (§15) descarta a proposito un mapa: con dos o tres paises por
 * articulo, las barras se leen mejor y no requieren dependencias.
 */
export function CountriesBar({ authors }: { authors: Author[] }) {
  const counts = new Map<string, number>();
  for (const author of authors) {
    const country = author.institutions?.[0]?.country;
    if (!country) continue;
    counts.set(country, (counts.get(country) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return <Unavailable>Ninguna afiliación declara país.</Unavailable>;
  }

  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(...rows.map(([, count]) => count));
  const unknown = authors.filter(
    (author) => !author.institutions?.[0]?.country,
  ).length;

  return (
    <div>
      <ul className="space-y-2">
        {rows.map(([code, count]) => (
          <li key={code} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-3">
            <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">
              {countryName(code)}
            </span>
            <span className="h-2.5 w-full rounded-[4px] bg-zinc-100 dark:bg-zinc-800">
              <span
                className="block h-full rounded-r-[4px] bg-[#2a78d6] dark:bg-[#3987e5]"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </span>
            <span className="text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
              {count}
            </span>
          </li>
        ))}
      </ul>
      {unknown > 0 ? (
        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
          {unknown} {unknown === 1 ? "autor" : "autores"} sin país declarado en
          la fuente.
        </p>
      ) : null}
    </div>
  );
}
