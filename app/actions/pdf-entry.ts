"use server";

import { redirect } from "next/navigation";
import { encodeDoiForUrl } from "@/lib/doi";
import { extractPdf, MAX_PDF_BYTES } from "@/lib/pdf/extract";
import { doiEnTextoDePdf } from "@/lib/resolve-input";
import { search } from "@/lib/search-service";
import type { Candidate } from "@/lib/search-service";

/**
 * Identificar un articulo a partir de su PDF.
 *
 * Se extrae el texto y se busca el DOI en la portada. Si no lo lleva impreso,
 * se busca por el titulo y se ofrecen candidatos: con un PDF en la mano es
 * tentador dar por hecho cual es el articulo, pero seguimos sin verificarlo.
 *
 * El archivo se descarta despues de leerlo. Para guardar el texto completo y
 * analizarlo, el PDF se sube desde la ficha del articulo ya guardado.
 */

export type PdfEntryState = {
  status: "idle" | "candidates" | "error";
  candidates?: Candidate[];
  query?: string;
  missingSources?: string[];
  message?: string;
};

const MENSAJES: Record<string, string> = {
  "too-large": `El archivo pasa de ${Math.round(MAX_PDF_BYTES / 1024 / 1024)} MB.`,
  "not-a-pdf": "Ese archivo no es un PDF.",
  "no-text-layer":
    "El PDF no tiene capa de texto: probablemente es un escaneado, así que no podemos leer su DOI.",
  failed: "No pudimos leer el PDF.",
};

/** Las primeras lineas con pinta de titulo, para buscar si no hay DOI. */
function tituloProbable(texto: string): string | undefined {
  const lineas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 15 && l.length < 200 && /[a-z]{4}/i.test(l));

  // Se descartan avisos de licencia y cabeceras de revista del principio.
  const candidata = lineas.find(
    (l) => !/^(provided|downloaded|licensed|copyright|©|received|accepted)/i.test(l),
  );
  return candidata;
}

export async function identifyFromPdf(
  _previous: PdfEntryState,
  formData: FormData,
): Promise<PdfEntryState> {
  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "No se recibió ningún archivo." };
  }

  const resultado = await extractPdf(new Uint8Array(await file.arrayBuffer()));
  if (!resultado.ok) {
    return { status: "error", message: MENSAJES[resultado.error] ?? MENSAJES.failed };
  }

  const texto = resultado.extraction.text;

  const doi = doiEnTextoDePdf(texto);
  if (doi) redirect(`/analyze/${encodeDoiForUrl(doi)}`);

  const titulo = tituloProbable(texto);
  if (titulo) {
    const busqueda = await search(titulo);
    if (busqueda.kind === "doi") redirect(`/analyze/${encodeDoiForUrl(busqueda.doi)}`);
    if (busqueda.kind === "candidates") {
      return {
        status: "candidates",
        candidates: busqueda.candidates,
        query: titulo,
        missingSources: busqueda.missingSources,
      };
    }
  }

  return {
    status: "error",
    message:
      "El PDF no imprime su DOI y no hemos podido identificarlo por el título. Prueba a pegar el DOI directamente.",
  };
}
