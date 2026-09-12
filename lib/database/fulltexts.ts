import "server-only";
import type { Section } from "@/lib/pdf/sections";
import { getSupabase, timedOut, withDeadline } from "@/lib/database/supabase";
import type { DbResult } from "@/lib/database/papers";

/**
 * Persistencia del texto completo extraido de un PDF.
 *
 * Se guarda el texto y las secciones detectadas, no el binario: es lo que se
 * usa despues, y quien subio el PDF ya lo tiene.
 */

const TIMEOUT_DETAIL = "La base de datos no respondió a tiempo.";

export interface StoredFulltext {
  filename: string;
  pages: number;
  characters: number;
  text: string;
  sections: Section[];
  createdAt: string;
}

function fail(detail?: string): DbResult<never> {
  return { ok: false, error: "failed", detail };
}

async function paperIdFor(doi: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const response = await withDeadline(
    supabase.from("papers").select("id").eq("doi", doi).maybeSingle(),
  );
  if (timedOut(response) || response.error) return null;
  return (response.data?.id as string) ?? null;
}

export async function saveFulltext(
  doi: string,
  fulltext: Omit<StoredFulltext, "createdAt">,
): Promise<DbResult<null>> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "not-configured" };

  const paperId = await paperIdFor(doi);
  // Solo se guarda el texto de articulos que estan en la biblioteca: si no, no
  // hay a que vincularlo.
  if (!paperId) return { ok: false, error: "not-configured" };

  const response = await withDeadline(
    supabase.from("paper_fulltexts").upsert(
      {
        paper_id: paperId,
        filename: fulltext.filename,
        pages: fulltext.pages,
        characters: fulltext.characters,
        text: fulltext.text,
        sections: fulltext.sections,
      },
      { onConflict: "paper_id" },
    ),
  );

  if (timedOut(response)) return fail(TIMEOUT_DETAIL);
  if (response.error) return fail(response.error.message);
  return { ok: true, data: null };
}

export async function getFulltext(
  doi: string,
): Promise<DbResult<StoredFulltext | null>> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "not-configured" };

  const paperId = await paperIdFor(doi);
  if (!paperId) return { ok: true, data: null };

  const response = await withDeadline(
    supabase
      .from("paper_fulltexts")
      .select("filename, pages, characters, text, sections, created_at")
      .eq("paper_id", paperId)
      .maybeSingle(),
  );

  if (timedOut(response)) return fail(TIMEOUT_DETAIL);
  if (response.error) return fail(response.error.message);
  if (!response.data) return { ok: true, data: null };

  const row = response.data as {
    filename: string;
    pages: number;
    characters: number;
    text: string;
    sections: Section[];
    created_at: string;
  };

  return {
    ok: true,
    data: {
      filename: row.filename,
      pages: row.pages,
      characters: row.characters,
      text: row.text,
      sections: row.sections ?? [],
      createdAt: row.created_at,
    },
  };
}

export async function deleteFulltext(doi: string): Promise<DbResult<null>> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "not-configured" };

  const paperId = await paperIdFor(doi);
  if (!paperId) return { ok: true, data: null };

  const response = await withDeadline(
    supabase.from("paper_fulltexts").delete().eq("paper_id", paperId),
  );
  if (timedOut(response)) return fail(TIMEOUT_DETAIL);
  if (response.error) return fail(response.error.message);
  return { ok: true, data: null };
}
