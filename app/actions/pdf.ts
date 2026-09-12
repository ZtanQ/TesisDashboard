"use server";

import { revalidatePath } from "next/cache";
import { normalizeDoi } from "@/lib/doi";
import { extractPdf, MAX_PDF_BYTES } from "@/lib/pdf/extract";
import { deleteFulltext, saveFulltext } from "@/lib/database/fulltexts";

/**
 * Subida del PDF de un articulo.
 *
 * El archivo se procesa y se descarta: se guarda el texto extraido, no el
 * binario. Quien lo sube ya tiene el PDF, y asi no hay que montar
 * almacenamiento de archivos.
 */

export type PdfActionState = {
  status: "idle" | "done" | "removed" | "error";
  message?: string;
  summary?: { filename: string; pages: number; characters: number; sections: number };
};

const MENSAJES: Record<string, string> = {
  "too-large": `El archivo pasa de ${Math.round(MAX_PDF_BYTES / 1024 / 1024)} MB.`,
  "not-a-pdf": "Ese archivo no es un PDF.",
  "no-text-layer":
    "El PDF no tiene capa de texto: probablemente es un escaneado. Haría falta OCR, que todavía no está implementado.",
  failed: "No pudimos leer el PDF.",
  "not-configured":
    "Para guardar el texto hay que tener el artículo en la biblioteca y la base de datos configurada.",
};

export async function uploadPdf(
  _previous: PdfActionState,
  formData: FormData,
): Promise<PdfActionState> {
  const doi = normalizeDoi(String(formData.get("doi") ?? ""));
  if (!doi) return { status: "error", message: "DOI no válido." };

  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "No se recibió ningún archivo." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await extractPdf(bytes);
  if (!result.ok) {
    return { status: "error", message: MENSAJES[result.error] ?? MENSAJES.failed };
  }

  const { extraction } = result;
  const saved = await saveFulltext(doi, {
    filename: file.name,
    pages: extraction.pages,
    characters: extraction.characters,
    text: extraction.text,
    sections: extraction.sections,
  });

  if (!saved.ok) {
    return {
      status: "error",
      message:
        saved.error === "not-configured"
          ? MENSAJES["not-configured"]
          : `No se pudo guardar el texto: ${saved.detail ?? "error desconocido"}`,
    };
  }

  revalidatePath(`/analyze/${encodeURIComponent(doi)}`);
  return {
    status: "done",
    summary: {
      filename: file.name,
      pages: extraction.pages,
      characters: extraction.characters,
      sections: extraction.sections.length,
    },
  };
}

export async function removePdf(
  _previous: PdfActionState,
  formData: FormData,
): Promise<PdfActionState> {
  const doi = normalizeDoi(String(formData.get("doi") ?? ""));
  if (!doi) return { status: "error", message: "DOI no válido." };

  const removed = await deleteFulltext(doi);
  if (!removed.ok) {
    return { status: "error", message: "No se pudo quitar el texto." };
  }

  revalidatePath(`/analyze/${encodeURIComponent(doi)}`);
  return { status: "removed" };
}
