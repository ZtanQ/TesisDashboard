"use client";

import { useActionState } from "react";
import type { Section } from "@/lib/pdf/sections";
import { formatNumber } from "@/lib/format";
import { removePdf, uploadPdf, type PdfActionState } from "@/app/actions/pdf";

/**
 * Subida del PDF del articulo.
 *
 * Solo tiene sentido con el articulo guardado en la biblioteca, que es donde
 * se vincula el texto. El PDF no se conserva: se extrae el texto y se descarta
 * el archivo.
 */

const INITIAL: PdfActionState = { status: "idle" };

export interface FulltextSummary {
  filename: string;
  pages: number;
  characters: number;
  sections: Section[];
  createdAt: string;
}

/** Cuenta cuántas secciones de cada tipo se reconocieron, para poder juzgarlo. */
function resumenSecciones(sections: Section[]): string {
  const reconocidas = sections.filter((s) => s.kind !== "other");
  if (reconocidas.length === 0) {
    return `${sections.length} bloques, ninguno reconocido por su nombre`;
  }
  const tipos = [...new Set(reconocidas.map((s) => s.kind))];
  return `${sections.length} secciones · reconocidas: ${tipos.join(", ")}`;
}

export function PdfUpload({
  doi,
  stored,
}: {
  doi: string;
  stored: FulltextSummary | null;
}) {
  const [subida, subir, subiendo] = useActionState(uploadPdf, INITIAL);
  const [borrado, borrar, borrando] = useActionState(removePdf, INITIAL);

  const yaHay = stored !== null && borrado.status !== "removed";
  const estado = subida.status === "error" ? subida : borrado;

  return (
    <div className="space-y-3">
      {yaHay ? (
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-900 dark:text-zinc-100">
            {stored.filename}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {stored.pages} {stored.pages === 1 ? "página" : "páginas"} ·{" "}
            {formatNumber(stored.characters)} caracteres ·{" "}
            {resumenSecciones(stored.sections)}
          </p>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            El análisis por IA usará este texto en lugar del abstract.
          </p>

          <form action={borrar} className="mt-3">
            <input type="hidden" name="doi" value={doi} />
            <button
              type="submit"
              disabled={borrando}
              className="text-sm text-zinc-500 underline-offset-4 hover:underline disabled:opacity-60 dark:text-zinc-400"
            >
              {borrando ? "Quitando…" : "Quitar el texto completo"}
            </button>
          </form>
        </div>
      ) : (
        <form action={subir} className="space-y-3">
          <input type="hidden" name="doi" value={doi} />
          <input
            type="file"
            name="pdf"
            accept="application/pdf,.pdf"
            required
            className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border file:border-zinc-300 file:bg-transparent file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-100 dark:text-zinc-300 dark:file:border-zinc-700 dark:file:text-zinc-100 dark:hover:file:bg-zinc-800"
          />
          <button
            type="submit"
            disabled={subiendo}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {subiendo ? "Procesando…" : "Subir PDF"}
          </button>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Se extrae el texto y se descarta el archivo: no se guarda el PDF.
          </p>
        </form>
      )}

      {estado.status === "error" && estado.message ? (
        <p
          role="alert"
          className="max-w-prose text-sm text-[#d03b3b] dark:text-[#e66767]"
        >
          {estado.message}
        </p>
      ) : null}
    </div>
  );
}
