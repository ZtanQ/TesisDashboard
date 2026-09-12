import Link from "next/link";
import { getAllSavedPapers, STATS_LIMIT } from "@/lib/database/papers";
import { countryName } from "@/lib/countries";
import { formatNumber } from "@/lib/format";
import {
  byQuartile,
  papersByYear,
  papersWithoutYear,
  summarize,
  topAuthors,
  topCountries,
  topInstitutions,
  topTopics,
} from "@/lib/statistics";
import { RankedBars } from "@/components/charts/ranked-bars";
import { YearColumns } from "@/components/charts/year-columns";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Section } from "@/components/ui/section";
import { ErrorNotice } from "@/components/ui/error-notice";

export const metadata = { title: "Estadísticas · PaperLens" };

/** Siempre refleja el estado actual de la biblioteca. */
export const dynamic = "force-dynamic";

export default async function StatisticsPage() {
  const resultado = await getAllSavedPapers();

  if (!resultado.ok) {
    return (
      <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-6 py-16">
        <ErrorNotice
          title={
            resultado.error === "not-configured"
              ? "Las estadísticas necesitan una base de datos."
              : "No pudimos leer la biblioteca."
          }
          detail={
            resultado.error === "not-configured"
              ? "Se calculan sobre los artículos guardados, así que hace falta configurar Supabase."
              : (resultado.detail ?? "La base de datos no respondió.")
          }
        />
      </main>
    );
  }

  const papers = resultado.data;

  if (papers.length === 0) {
    return (
      <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-6 py-16">
        <ErrorNotice
          title="Tu biblioteca está vacía."
          detail="Guarda algunos artículos y aquí verás cómo se reparten por año, país, institución y tópico."
        />
      </main>
    );
  }

  const resumen = summarize(papers);
  const porAnio = papersByYear(papers);
  const sinAnio = papersWithoutYear(papers);
  const cuartiles = byQuartile(papers);
  const conCuartil = cuartiles
    .filter((b) => b.label !== "Sin dato")
    .reduce((total, b) => total + b.count, 0);

  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-6 py-12">
      <Link
        href="/library"
        className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
      >
        ← Biblioteca
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Estadísticas de la biblioteca
      </h1>
      {papers.length >= STATS_LIMIT ? (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Calculado sobre los {formatNumber(STATS_LIMIT)} artículos más
          recientes.
        </p>
      ) : null}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard label="Artículos" value={formatNumber(resumen.papers)} />
        <MetricCard
          label="Autores"
          value={formatNumber(resumen.authors)}
          footnote="Aproximado: se agrupan por nombre"
        />
        <MetricCard
          label="Instituciones"
          value={formatNumber(resumen.institutions)}
        />
        <MetricCard label="Países" value={formatNumber(resumen.countries)} />
        <MetricCard label="Tópicos" value={formatNumber(resumen.topics)} />
        <MetricCard
          label="Citas"
          value={formatNumber(resumen.citations)}
          footnote={
            resumen.papersWithoutCitations > 0
              ? `${resumen.papersWithoutCitations} sin dato de citas`
              : undefined
          }
        />
      </div>

      <Section
        title="Publicaciones por año"
        hint="Los años sin artículos se muestran vacíos para no comprimir el eje."
      >
        <YearColumns
          data={porAnio}
          emptyMessage="Ningún artículo guardado declara año."
        />
        {sinAnio > 0 ? (
          <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
            {sinAnio} {sinAnio === 1 ? "artículo" : "artículos"} sin año
            declarado, fuera de este gráfico.
          </p>
        ) : null}
      </Section>

      <Section
        title="Cuartiles"
        hint="El cuartil corresponde a la revista, no al artículo."
      >
        <RankedBars data={cuartiles} emptyMessage="Sin datos." labelWidth="6rem" />
        {conCuartil === 0 ? (
          <p className="mt-3 max-w-prose text-xs text-zinc-400 dark:text-zinc-500">
            Ninguna de las fuentes integradas (Semantic Scholar y OpenAlex)
            publica el cuartil, así que hoy todos los artículos caen en «sin
            dato». Haría falta incorporar una fuente que lo publique.
          </p>
        ) : null}
      </Section>

      <Section title="Tópicos más frecuentes">
        <RankedBars
          data={topTopics(papers)}
          emptyMessage="Las fuentes no asignan tópicos a estos artículos."
          labelWidth="14rem"
        />
      </Section>

      <Section title="Países">
        <RankedBars
          data={topCountries(papers).map((bucket) => ({
            label: countryName(bucket.label),
            count: bucket.count,
          }))}
          emptyMessage="Ninguna afiliación declara país."
          labelWidth="10rem"
        />
      </Section>

      <Section title="Instituciones">
        <RankedBars
          data={topInstitutions(papers)}
          emptyMessage="Las fuentes no declaran instituciones para estos artículos."
          labelWidth="16rem"
        />
      </Section>

      <Section
        title="Autores más frecuentes"
        hint="Agrupados por nombre: dos grafías del mismo autor pueden contar por separado."
      >
        <RankedBars
          data={topAuthors(papers)}
          emptyMessage="Sin autores registrados."
          labelWidth="12rem"
        />
      </Section>
    </main>
  );
}
