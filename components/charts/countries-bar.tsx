import type { Author } from "@/types/author";
import { countryName } from "@/lib/countries";
import { RankedBars } from "@/components/charts/ranked-bars";
import { Unavailable } from "@/components/ui/unavailable";

/**
 * Autores por pais de un articulo, en barras ordenadas.
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

  const data = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => ({ label: countryName(code), count }));

  const unknown = authors.filter(
    (author) => !author.institutions?.[0]?.country,
  ).length;

  return (
    <div>
      <RankedBars data={data} emptyMessage="Sin países declarados." labelWidth="8rem" />
      {unknown > 0 ? (
        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
          {unknown} {unknown === 1 ? "autor" : "autores"} sin país declarado en
          la fuente.
        </p>
      ) : null}
    </div>
  );
}
