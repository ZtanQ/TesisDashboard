"use server";

import { redirect } from "next/navigation";
import { encodeDoiForUrl } from "@/lib/doi";
import { search } from "@/lib/search-service";
import type { Candidate } from "@/lib/search-service";

/**
 * Busqueda desde la portada.
 *
 * Cuando la entrada identifica un articulo (un DOI, o un enlace del que se
 * puede deducir), se salta directo a su ficha. Cuando no, se devuelven
 * candidatos para que elija el usuario: afirmar cual es sin que nadie lo haya
 * comprobado seria justo lo que este proyecto no hace.
 */

export type SearchState = {
  status: "idle" | "candidates" | "not-found" | "error";
  candidates?: Candidate[];
  query?: string;
  missingSources?: string[];
  message?: string;
};

export async function runSearch(
  _previous: SearchState,
  formData: FormData,
): Promise<SearchState> {
  const entrada = String(formData.get("query") ?? "");
  const resultado = await search(entrada);

  switch (resultado.kind) {
    case "empty":
      return { status: "error", message: "Escribe un DOI, un enlace o un título." };
    case "doi":
      // redirect lanza; tiene que quedar fuera de cualquier try/catch.
      redirect(`/analyze/${encodeDoiForUrl(resultado.doi)}`);
    case "candidates":
      return {
        status: "candidates",
        candidates: resultado.candidates,
        query: resultado.query,
        missingSources: resultado.missingSources,
      };
    case "not-found":
      return { status: "not-found", message: resultado.detail };
  }
}
