"use client";

import { useActionState } from "react";
import {
  removeFromLibrary,
  saveToLibrary,
  type LibraryActionState,
} from "@/app/actions/library";

const INITIAL: LibraryActionState = { status: "idle" };

/**
 * Guardar o quitar un articulo de la biblioteca.
 *
 * `isSaved` viene del servidor, que ya consulto la base de datos al construir
 * la pagina. Tras actuar, la accion revalida la ruta y el valor vuelve a
 * llegar actualizado; el estado local solo cubre el intervalo entre medias.
 */
export function SaveButton({
  doi,
  isSaved,
}: {
  doi: string;
  isSaved: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    isSaved ? removeFromLibrary : saveToLibrary,
    INITIAL,
  );

  const label = isSaved ? "Quitar de la biblioteca" : "Guardar en la biblioteca";

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="doi" value={doi} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {pending ? "Guardando…" : label}
        </button>
      </form>

      {state.status === "error" && state.message ? (
        <p role="alert" className="mt-2 text-sm text-[#d03b3b] dark:text-[#e66767]">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
