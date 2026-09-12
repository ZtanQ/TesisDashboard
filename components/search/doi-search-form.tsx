"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { encodeDoiForUrl, normalizeDoi } from "@/lib/doi";
import { PAPER_ERROR_MESSAGES } from "@/lib/errors";

/**
 * Entrada principal de la aplicacion. Valida el DOI en el cliente antes de
 * navegar: un identificador mal escrito no merece un viaje al servidor, y el
 * usuario recibe el error al instante.
 *
 * El DOI viaja codificado en la ruta porque contiene "/".
 */
export function DoiSearchForm({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const doi = normalizeDoi(value);

    if (!doi) {
      setError(PAPER_ERROR_MESSAGES["invalid-doi"].title);
      return;
    }

    setError(null);
    startTransition(() => {
      router.push(`/analyze/${encodeDoiForUrl(doi)}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="doi" className="sr-only">
        DOI del artículo
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="doi"
          name="doi"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="10.xxxx/xxxxx"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "doi-error" : undefined}
          className="w-full flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 font-mono text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#2a78d6] focus:ring-2 focus:ring-[#2a78d6]/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-[#3987e5]"
        />

        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {isPending ? "Analizando…" : "Analizar"}
        </button>
      </div>

      {error ? (
        <p
          id="doi-error"
          role="alert"
          className="mt-3 text-sm text-[#d03b3b] dark:text-[#e66767]"
        >
          {error}
        </p>
      ) : null}

      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        Acepta el DOI directo o la URL de doi.org. Próximamente también título y
        PDF.
      </p>
    </form>
  );
}
