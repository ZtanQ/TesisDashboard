import Link from "next/link";
import { normalizeDoi, encodeDoiForUrl } from "@/lib/doi";
import { getSavedPapers } from "@/lib/database/papers";
import { getSavedAnalyses } from "@/lib/database/analyses";
import { countryName } from "@/lib/countries";
import { findQuartile } from "@/types/metrics";
import { formatNumber } from "@/lib/format";
import {
  compareTopics,
  methodologies,
  spread,
  topicFrequency,
  unionCountries,
  type ComparedPaper,
} from "@/lib/comparison";
import { Section } from "@/components/ui/section";
import { Unavailable } from "@/components/ui/unavailable";
import { ErrorNotice } from "@/components/ui/error-notice";

export const metadata = { title: "Comparar · PaperLens" };

/** Siempre refleja el estado actual de la biblioteca. */
export const dynamic = "force-dynamic";

const TIPOS: Record<string, string> = {
  "journal-article": "Revista",
  "conference-paper": "Congreso",
  "book-chapter": "Capítulo",
  preprint: "Preprint",
  other: "Otro",
};

function Celda({ children }: { children: React.ReactNode }) {
  return (
    <td className="border-b border-zinc-100 px-3 py-2 align-top text-sm text-zinc-800 dark:border-zinc-900 dark:text-zinc-200">
      {children}
    </td>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="row"
      className="whitespace-nowrap border-b border-zinc-100 py-2 pr-4 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-900 dark:text-zinc-400"
    >
      {children}
    </th>
  );
}

export default async function ComparePage({
  searchParams,
}: PageProps<"/compare">) {
  const params = await searchParams;
  const crudos = params.doi;
  const pedidos = (Array.isArray(crudos) ? crudos : crudos ? [crudos] : [])
    .map((valor) => normalizeDoi(decodeURIComponent(valor)))
    .filter((doi): doi is string => doi !== null);

  const vacio = (
    <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-6 py-16">
      <ErrorNotice
        title="No hay nada que comparar."
        detail="Elige al menos dos artículos en tu biblioteca y pulsa «Comparar»."
      />
    </main>
  );

  if (pedidos.length < 2) return vacio;

  const [resultado, analisis] = await Promise.all([
    getSavedPapers(pedidos),
    getSavedAnalyses(pedidos),
  ]);

  if (!resultado.ok) {
    return (
      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-6 py-16">
        <ErrorNotice
          title={
            resultado.error === "not-configured"
              ? "Comparar necesita una base de datos."
              : "No pudimos leer la biblioteca."
          }
          detail={
            resultado.error === "not-configured"
              ? "Solo se comparan artículos guardados, así que hace falta configurar Supabase."
              : (resultado.detail ?? "La base de datos no respondió.")
          }
        />
      </main>
    );
  }

  if (resultado.data.length < 2) return vacio;

  const porDoi = analisis.ok ? analisis.data : {};
  const papers: ComparedPaper[] = resultado.data.map((paper) => ({
    paper,
    analysis: porDoi[paper.doi ?? ""] ?? null,
  }));

  const topicos = compareTopics(papers);
  const frecuencia = topicFrequency(papers);
  const metodos = methodologies(papers);
  const citas = spread(papers, (p) => p.citationCount);
  const anios = spread(papers, (p) => p.year);
  const paises = unionCountries(papers);

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-6 py-12">
      <Link
        href="/library"
        className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
      >
        ← Biblioteca
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Comparación de {papers.length} artículos
      </h1>
      {pedidos.length !== papers.length ? (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {pedidos.length - papers.length} de los artículos pedidos no están en
          la biblioteca y se han omitido.
        </p>
      ) : null}

      <div className="mt-8 w-full min-w-0 overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse">
          <thead>
            <tr>
              <th className="w-36" />
              {papers.map(({ paper }) => (
                <th
                  key={paper.doi}
                  scope="col"
                  className="border-b border-zinc-200 px-3 py-2 text-left align-bottom dark:border-zinc-800"
                >
                  <Link
                    href={`/analyze/${encodeDoiForUrl(paper.doi ?? "")}`}
                    className="text-sm font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
                  >
                    {paper.title}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <Etiqueta>Año</Etiqueta>
              {papers.map(({ paper }) => (
                <Celda key={paper.doi}>
                  {paper.year ?? <Unavailable>—</Unavailable>}
                </Celda>
              ))}
            </tr>
            <tr>
              <Etiqueta>Revista / congreso</Etiqueta>
              {papers.map(({ paper }) => (
                <Celda key={paper.doi}>
                  {paper.venue ?? <Unavailable>—</Unavailable>}
                </Celda>
              ))}
            </tr>
            <tr>
              <Etiqueta>Tipo</Etiqueta>
              {papers.map(({ paper }) => (
                <Celda key={paper.doi}>
                  {paper.publicationType ? (
                    TIPOS[paper.publicationType]
                  ) : (
                    <Unavailable>—</Unavailable>
                  )}
                </Celda>
              ))}
            </tr>
            <tr>
              <Etiqueta>Cuartil</Etiqueta>
              {papers.map(({ paper }) => (
                <Celda key={paper.doi}>
                  {findQuartile(paper.metrics)?.quartile ?? <Unavailable>—</Unavailable>}
                </Celda>
              ))}
            </tr>
            <tr>
              <Etiqueta>Citas</Etiqueta>
              {papers.map(({ paper }) => (
                <Celda key={paper.doi}>
                  {paper.citationCount !== undefined ? (
                    formatNumber(paper.citationCount)
                  ) : (
                    <Unavailable>—</Unavailable>
                  )}
                </Celda>
              ))}
            </tr>
            <tr>
              <Etiqueta>Países</Etiqueta>
              {papers.map(({ paper }) => (
                <Celda key={paper.doi}>
                  {paper.countries.length > 0 ? (
                    paper.countries.map((c) => countryName(c)).join(", ")
                  ) : (
                    <Unavailable>—</Unavailable>
                  )}
                </Celda>
              ))}
            </tr>
            <tr>
              <Etiqueta>Autores</Etiqueta>
              {papers.map(({ paper }) => (
                <Celda key={paper.doi}>
                  {paper.authors.length > 0 ? (
                    paper.authors.length
                  ) : (
                    <Unavailable>—</Unavailable>
                  )}
                </Celda>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <Section title="Tópicos">
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              En todos
            </p>
            {topicos.shared.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {topicos.shared.map((topic) => (
                  <li
                    key={topic}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1">
                <Unavailable>
                  No hay ningún tópico presente en todos los artículos.
                </Unavailable>
              </p>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              En cuántos artículos aparece cada uno
            </p>
            <ul className="mt-2 space-y-1">
              {frecuencia.map(({ topic, count }) => (
                <li
                  key={topic}
                  className="flex items-baseline justify-between gap-4 border-b border-zinc-100 pb-1 text-sm last:border-0 dark:border-zinc-900"
                >
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {topic}
                  </span>
                  <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                    {count} de {papers.length}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section
        title="Metodología"
        hint="Interpretación generada por IA, no un dato de las fuentes."
      >
        <div className="space-y-3">
          {metodos.map((metodo) => {
            const titulo =
              papers.find(({ paper }) => paper.doi === metodo.doi)?.paper.title ??
              metodo.doi;
            return (
              <div
                key={metodo.doi}
                className="border-b border-zinc-100 pb-3 last:border-0 dark:border-zinc-900"
              >
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {titulo}
                </p>
                <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
                  {metodo.methodology ?? (
                    <Unavailable>
                      {metodo.analyzed
                        ? "El análisis no encontró metodología declarada."
                        : "Este artículo todavía no se ha analizado con IA."}
                    </Unavailable>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Rangos">
        <dl className="space-y-2 text-sm">
          <div className="flex flex-wrap items-baseline gap-x-4 border-b border-zinc-100 pb-2 dark:border-zinc-900">
            <dt className="w-32 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Años
            </dt>
            <dd className="text-zinc-800 dark:text-zinc-200">
              {anios ? (
                anios.min === anios.max ? (
                  anios.min
                ) : (
                  `${anios.min}–${anios.max}`
                )
              ) : (
                <Unavailable>—</Unavailable>
              )}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4 border-b border-zinc-100 pb-2 dark:border-zinc-900">
            <dt className="w-32 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Citas
            </dt>
            <dd className="text-zinc-800 dark:text-zinc-200">
              {citas ? (
                <>
                  {formatNumber(citas.min)}–{formatNumber(citas.max)}
                  {citas.missing > 0 ? (
                    <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">
                      ({citas.missing} sin dato)
                    </span>
                  ) : null}
                </>
              ) : (
                <Unavailable>—</Unavailable>
              )}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4">
            <dt className="w-32 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Países
            </dt>
            <dd className="text-zinc-800 dark:text-zinc-200">
              {paises.length > 0 ? (
                paises.map((c) => countryName(c)).join(", ")
              ) : (
                <Unavailable>Ninguna afiliación declara país.</Unavailable>
              )}
            </dd>
          </div>
        </dl>
      </Section>
    </main>
  );
}
