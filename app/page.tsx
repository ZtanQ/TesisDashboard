import Link from "next/link";
import { DoiSearchForm } from "@/components/search/doi-search-form";
import { encodeDoiForUrl } from "@/lib/doi";
import { EXAMPLE_DOIS } from "@/lib/examples";

export default function Home() {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-2xl flex-1 flex-col justify-center px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        PaperLens
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Analiza un artículo científico.
      </p>

      <div className="mt-8">
        <DoiSearchForm />
      </div>

      <section className="mt-12 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          Ejemplos
        </h2>
        <ul className="mt-4 space-y-2">
          {EXAMPLE_DOIS.map((example) => (
            <li key={example.doi}>
              <Link
                href={`/analyze/${encodeDoiForUrl(example.doi)}`}
                className="group flex flex-wrap items-baseline gap-x-3 text-sm"
              >
                <span className="text-zinc-900 underline-offset-4 group-hover:underline dark:text-zinc-100">
                  {example.label}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {example.note}
                </span>
                <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
                  {example.doi}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8">
        <Link
          href="/library"
          className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
        >
          Ver mi biblioteca →
        </Link>
      </p>

      <p className="mt-10 text-xs text-zinc-400 dark:text-zinc-500">
        Los datos provienen de Semantic Scholar. Las instituciones, los países y
        el cuartil todavía no están disponibles: los aportará OpenAlex más
        adelante.
      </p>
    </main>
  );
}
