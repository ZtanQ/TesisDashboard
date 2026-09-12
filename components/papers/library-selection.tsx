"use client";

import Link from "next/link";
import { useState } from "react";
import { encodeDoiForUrl } from "@/lib/doi";
import { Unavailable } from "@/components/ui/unavailable";
import { formatNumber } from "@/lib/format";
import type { LibraryEntry } from "@/lib/database/papers";

/**
 * Tabla de la biblioteca con seleccion multiple para comparar.
 *
 * La seleccion vive en la URL de /compare, no en el servidor: asi una
 * comparacion concreta se puede compartir o volver a abrir sin repetir la
 * seleccion.
 */

const MINIMO = 2;
const MAXIMO = 6;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function LibrarySelection({ entries }: { entries: LibraryEntry[] }) {
  const [seleccion, setSeleccion] = useState<string[]>([]);

  function alternar(doi: string) {
    setSeleccion((previa) =>
      previa.includes(doi)
        ? previa.filter((d) => d !== doi)
        : previa.length >= MAXIMO
          ? previa
          : [...previa, doi],
    );
  }

  const suficientes = seleccion.length >= MINIMO;
  const href = `/compare?${seleccion.map((doi) => `doi=${encodeDoiForUrl(doi)}`).join("&")}`;

  return (
    <div>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {seleccion.length === 0
            ? `Selecciona al menos ${MINIMO} artículos para compararlos.`
            : `${seleccion.length} seleccionados${seleccion.length >= MAXIMO ? ` (máximo ${MAXIMO})` : ""}`}
        </p>

        {suficientes ? (
          <Link
            href={href}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Comparar {seleccion.length}
          </Link>
        ) : null}

        {seleccion.length > 0 ? (
          <button
            type="button"
            onClick={() => setSeleccion([])}
            className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
          >
            Limpiar
          </button>
        ) : null}
      </div>

      <div className="mt-4 w-full min-w-0 overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="w-8 py-2 pr-2 font-medium">
                <span className="sr-only">Seleccionar</span>
              </th>
              <th className="py-2 pr-4 font-medium">Artículo</th>
              <th className="py-2 pr-4 font-medium">Año</th>
              <th className="py-2 pr-4 font-medium">Q</th>
              <th className="py-2 pr-4 font-medium">Citas</th>
              <th className="py-2 font-medium">Guardado</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const marcado = seleccion.includes(entry.doi);
              return (
                <tr
                  key={entry.doi}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                >
                  <td className="py-3 pr-2 align-top">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => alternar(entry.doi)}
                      disabled={!marcado && seleccion.length >= MAXIMO}
                      aria-label={`Seleccionar ${entry.title}`}
                      className="mt-1 h-4 w-4 accent-[#2a78d6]"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/analyze/${encodeDoiForUrl(entry.doi)}`}
                      className="text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
                    >
                      {entry.title}
                    </Link>
                    {entry.venue ? (
                      <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                        {entry.venue}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-zinc-600 dark:text-zinc-300">
                    {entry.year ?? <Unavailable>—</Unavailable>}
                  </td>
                  <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-300">
                    {entry.quartile ?? <Unavailable>—</Unavailable>}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-zinc-600 dark:text-zinc-300">
                    {entry.citationCount !== undefined ? (
                      formatNumber(entry.citationCount)
                    ) : (
                      <Unavailable>—</Unavailable>
                    )}
                  </td>
                  <td className="py-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDate(entry.savedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
