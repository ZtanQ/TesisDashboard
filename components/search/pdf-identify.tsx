"use client";

import Link from "next/link";
import { useActionState } from "react";
import { encodeDoiForUrl } from "@/lib/doi";
import { identifyFromPdf, type PdfEntryState } from "@/app/actions/pdf-entry";

/**
 * Identificar un articulo subiendo su PDF.
 *
 * Solo se lee el archivo para averiguar de que articulo se trata; no se
 * guarda. El texto completo se sube despues desde la ficha, que es donde hay
 * a que vincularlo.
 */

const INITIAL: PdfEntryState = { status: "idle" };

export function PdfIdentify() {
  const [state, formAction, pending] = useActionState(identifyFromPdf, INITIAL);

  return (
    <div>
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="file"
          name="pdf"
          accept="application/pdf,.pdf"
          required
          className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border file:border-zinc-300 file:bg-transparent file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-100 dark:text-zinc-300 dark:file:border-zinc-700 dark:file:text-zinc-100 dark:hover:file:bg-zinc-800"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {pending ? "Leyendo…" : "Identificar"}
        </button>
      </form>

      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
        Se lee el DOI impreso en la portada. El archivo no se guarda.
      </p>

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="mt-3 max-w-prose text-sm text-[#d03b3b] dark:text-[#e66767]"
        >
          {state.message}
        </p>
      ) : null}

      {state.status === "candidates" && state.candidates ? (
        <div className="mt-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            El PDF no imprime su DOI. Por el título parece uno de estos:
          </p>
          <ul className="mt-3 space-y-1">
            {state.candidates.slice(0, 5).map((candidato) => (
              <li key={candidato.doi}>
                <Link
                  href={`/analyze/${encodeDoiForUrl(candidato.doi)}`}
                  className="block rounded-lg border border-zinc-200 px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {candidato.title}
                  </span>
                  <span className="mt-1 block text-xs text-zinc-400 dark:text-zinc-500">
                    {[candidato.venue, candidato.year?.toString()]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
