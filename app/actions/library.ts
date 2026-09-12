"use server";

import { revalidatePath } from "next/cache";
import { normalizeDoi } from "@/lib/doi";
import { getPaperByDoi } from "@/lib/paper-service";
import { deleteSavedPaper, savePaper } from "@/lib/database/papers";

/**
 * Acciones de la biblioteca.
 *
 * Reciben solo el DOI, no el articulo entero: la consulta a la fuente esta
 * cacheada, asi que recuperarlo en el servidor es barato y evita que el
 * cliente decida que se guarda.
 */

export type LibraryActionState = {
  status: "idle" | "saved" | "removed" | "error";
  message?: string;
};

export async function saveToLibrary(
  _previous: LibraryActionState,
  formData: FormData,
): Promise<LibraryActionState> {
  const doi = normalizeDoi(String(formData.get("doi") ?? ""));
  if (!doi) return { status: "error", message: "DOI no válido." };

  const result = await getPaperByDoi(doi);
  if (!result.ok) {
    return {
      status: "error",
      message: "No pudimos recuperar el artículo para guardarlo.",
    };
  }

  const saved = await savePaper(result.paper);
  if (!saved.ok) {
    return {
      status: "error",
      message:
        saved.error === "not-configured"
          ? "La biblioteca necesita una base de datos configurada."
          : `No se pudo guardar: ${saved.detail ?? "error desconocido"}`,
    };
  }

  revalidatePath("/library");
  revalidatePath(`/analyze/${encodeURIComponent(doi)}`);
  return { status: "saved" };
}

export async function removeFromLibrary(
  _previous: LibraryActionState,
  formData: FormData,
): Promise<LibraryActionState> {
  const doi = normalizeDoi(String(formData.get("doi") ?? ""));
  if (!doi) return { status: "error", message: "DOI no válido." };

  const removed = await deleteSavedPaper(doi);
  if (!removed.ok) {
    return {
      status: "error",
      message:
        removed.error === "not-configured"
          ? "La biblioteca necesita una base de datos configurada."
          : `No se pudo eliminar: ${removed.detail ?? "error desconocido"}`,
    };
  }

  revalidatePath("/library");
  revalidatePath(`/analyze/${encodeURIComponent(doi)}`);
  return { status: "removed" };
}
