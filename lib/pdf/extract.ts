import "server-only";
import { limpiarTextoPdf } from "@/lib/pdf/clean";
import { detectarSecciones, type Section } from "@/lib/pdf/sections";

/**
 * Extraccion de texto de un PDF.
 *
 * Se extrae, se limpia y se parte en secciones. No se guarda el binario: lo
 * que se usa despues es el texto, y el PDF ya lo tiene quien lo subio.
 */

/** Tope de tamano del archivo. Un articulo rara vez pasa de unos megas. */
export const MAX_PDF_BYTES = 25 * 1024 * 1024;

/** Por debajo de esto, el PDF es escaneado o no tiene capa de texto. */
const MIN_CHARS_UTILES = 500;

export type PdfErrorCode =
  | "too-large"
  | "not-a-pdf"
  | "no-text-layer"
  | "failed";

export interface PdfExtraction {
  text: string;
  sections: Section[];
  pages: number;
  characters: number;
}

export type PdfResult =
  | { ok: true; extraction: PdfExtraction }
  | { ok: false; error: PdfErrorCode; detail?: string };

/** Los PDF empiezan por "%PDF-". Comprobarlo evita procesar otra cosa. */
function pareceUnPdf(bytes: Uint8Array): boolean {
  return (
    bytes.length > 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export async function extractPdf(bytes: Uint8Array): Promise<PdfResult> {
  if (bytes.byteLength > MAX_PDF_BYTES) return { ok: false, error: "too-large" };
  if (!pareceUnPdf(bytes)) return { ok: false, error: "not-a-pdf" };

  try {
    // Import dinamico: unpdf carga pdf.js, que es pesado y solo hace falta
    // cuando alguien sube un archivo.
    const { extractText, getDocumentProxy } = await import("unpdf");

    const doc = await getDocumentProxy(bytes);
    const { text, totalPages } = await extractText(doc, { mergePages: true });

    const limpio = limpiarTextoPdf(text);

    // Un PDF escaneado extrae casi nada. Decirlo es mejor que analizar tres
    // palabras sueltas como si fueran el articulo.
    if (limpio.length < MIN_CHARS_UTILES) {
      return { ok: false, error: "no-text-layer" };
    }

    return {
      ok: true,
      extraction: {
        text: limpio,
        sections: detectarSecciones(limpio),
        pages: totalPages,
        characters: limpio.length,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: "failed",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
