"use client";

import { useEffect } from "react";
import { ErrorNotice } from "@/components/ui/error-notice";

/**
 * Excepciones no previstas. Los fallos que si esperamos (DOI invalido, sin
 * resultados, fuente caida) se modelan como valores de retorno en
 * `paper-service` y no llegan hasta aqui.
 *
 * En Next 16 la prop de reintento se llama `retry`, no `reset`.
 */
export default function AnalyzeError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-6 py-16">
      <ErrorNotice
        title="Algo falló al analizar el artículo."
        detail="No pudimos completar el análisis. Puedes reintentarlo; si vuelve a ocurrir, revisa la consola."
        action={
          <button
            type="button"
            onClick={retry}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Reintentar
          </button>
        }
      />
    </main>
  );
}
