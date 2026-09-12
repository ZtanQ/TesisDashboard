"use client";

import Link from "next/link";
import { useActionState } from "react";
import { encodeDoiForUrl } from "@/lib/doi";
import { formatNumber } from "@/lib/format";
import { runSearch, type SearchState } from "@/app/actions/search";

/**
 * Entrada principal de la aplicacion.
 *
 * Acepta DOI, enlaces y titulos. Cuando la entrada identifica un articulo se
 * va directo a su ficha; cuando no, se muestran candidatos y **elige el
 * usuario**: dar por bueno el primer resultado seria afirmar una
 * identificacion que nadie ha comprobado.
 */

const INITIAL: SearchState = { status: "idle" };

function Candidatos({
  candidates,
  query,
  missingSources,
}: {
  candidates: NonNullable<SearchState["candidates"]>;
  query?: string;
  missingSources?: string[];
}) {
  return (
    <div className="mt-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        No hay un identificador en lo que escribiste, así que esto es lo que
        encontramos{query ? <> para «{query}»</> : null}. Elige el correcto:
      </p>

      <ul className="mt-4 space-y-1">
        {candidates.map((candidato) => (
          <li key={candidato.doi}>
            <Link
              href={`/analyze/${encodeDoiForUrl(candidato.doi)}`}
              className="block rounded-lg border border-zinc-200 px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {candidato.title}
              </span>
              {candidato.authors.length > 0 ? (
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                  {candidato.authors.slice(0, 4).join(" · ")}
                  {candidato.authors.length > 4 ? " …" : ""}
                </span>
              ) : null}
              <span className="mt-1 block text-xs text-zinc-400 dark:text-zinc-500">
                {[
                  candidato.venue,
                  candidato.year?.toString(),
                  candidato.citationCount !== undefined
                    ? `${formatNumber(candidato.citationCount)} citas`
                    : undefined,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <span className="mt-1 block font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                {candidato.doi}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-3 max-w-prose text-xs text-zinc-400 dark:text-zinc-500">
        Resultados de OpenAlex y Crossref. Si ninguno es el tuyo, prueba con el
        DOI.
        {missingSources && missingSources.length > 0 ? (
          <>
            {" "}
            <strong className="font-medium">
              {missingSources.join(" y ")} no respondió
            </strong>
            , así que esta lista puede estar incompleta; vuelve a intentarlo en
            unos segundos.
          </>
        ) : null}
      </p>
    </div>
  );
}

export function DoiSearchForm() {
  const [state, formAction, pending] = useActionState(runSearch, INITIAL);

  return (
    <div>
      <form action={formAction} noValidate>
        <label htmlFor="query" className="sr-only">
          DOI, enlace o título del artículo
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="query"
            name="query"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="DOI, enlace o título del artículo"
            aria-describedby="query-ayuda"
            className="w-full flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#2a78d6] focus:ring-2 focus:ring-[#2a78d6]/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-[#3987e5]"
          />

          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {pending ? "Buscando…" : "Analizar"}
          </button>
        </div>

        <p
          id="query-ayuda"
          className="mt-3 text-xs text-zinc-500 dark:text-zinc-400"
        >
          Acepta el DOI, un enlace de la editorial, arXiv o PubMed, o el título.
        </p>
      </form>

      {state.status === "error" || state.status === "not-found" ? (
        <p
          role="alert"
          className="mt-3 max-w-prose text-sm text-[#d03b3b] dark:text-[#e66767]"
        >
          {state.message}
        </p>
      ) : null}

      {state.status === "candidates" && state.candidates ? (
        <Candidatos
          candidates={state.candidates}
          query={state.query}
          missingSources={state.missingSources}
        />
      ) : null}
    </div>
  );
}
