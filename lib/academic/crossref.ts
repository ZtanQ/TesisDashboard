/**
 * Cliente de la API de Crossref.
 *
 * Crossref es la agencia que registra los DOI, asi que su ficha es el registro
 * autoritativo de la publicacion: editorial, volumen, paginas, licencia y la
 * lista de referencias tal como las deposito el editor. No es un indice de
 * citas, de modo que complementa a las otras dos fuentes en vez de competir.
 *
 * No usa clave. Indicar un email en `CROSSREF_EMAIL` entra en el "polite
 * pool", con mejor servicio y limites mas holgados.
 */

const API_BASE = "https://api.crossref.org";
const TIMEOUT_MS = 10_000;

// --- Forma cruda de la respuesta -------------------------------------------

export interface CrossrefAuthor {
  given?: string | null;
  family?: string | null;
  name?: string | null;
  ORCID?: string | null;
  sequence?: string | null;
  affiliation?: { name?: string | null }[] | null;
}

export interface CrossrefReference {
  key?: string | null;
  DOI?: string | null;
  "article-title"?: string | null;
  "journal-title"?: string | null;
  author?: string | null;
  year?: string | null;
  unstructured?: string | null;
}

export interface CrossrefWork {
  DOI?: string | null;
  title?: string[] | null;
  "container-title"?: string[] | null;
  publisher?: string | null;
  type?: string | null;
  ISSN?: string[] | null;
  volume?: string | null;
  issue?: string | null;
  page?: string | null;
  language?: string | null;
  abstract?: string | null;
  subject?: string[] | null;
  author?: CrossrefAuthor[] | null;
  /** Recuento de citas segun Crossref: no coincide con el de los demas. */
  "is-referenced-by-count"?: number | null;
  "references-count"?: number | null;
  reference?: CrossrefReference[] | null;
  license?: { URL?: string | null }[] | null;
  funder?: { name?: string | null; award?: string[] | null }[] | null;
  URL?: string | null;
  /** Presente cuando este DOI retracta o corrige a otro. */
  "update-to"?: { type?: string | null; DOI?: string | null }[] | null;
  /** Fecha de publicacion, en partes: [[anio, mes, dia]]. */
  issued?: { "date-parts"?: number[][] | null } | null;
}

export type CrossrefError = "not-found" | "rate-limited" | "unavailable";

export type CrossrefResult =
  | { ok: true; work: CrossrefWork }
  | { ok: false; error: CrossrefError };

export async function fetchWorkByDoi(doi: string): Promise<CrossrefResult> {
  const email = process.env.CROSSREF_EMAIL;
  const url = `${API_BASE}/works/${encodeURIComponent(doi)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        // Crossref pide identificarse; el email entra en el "polite pool".
        "User-Agent": email
          ? `PaperLens/0.1 (mailto:${email})`
          : "PaperLens/0.1",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 3600 },
    });
  } catch {
    return { ok: false, error: "unavailable" };
  }

  if (response.status === 404) return { ok: false, error: "not-found" };
  if (response.status === 429) return { ok: false, error: "rate-limited" };
  if (!response.ok) return { ok: false, error: "unavailable" };

  try {
    const json = (await response.json()) as { message?: CrossrefWork };
    const work = json?.message;
    const title = work?.title?.[0]?.trim();
    if (!work || !title) return { ok: false, error: "not-found" };
    return { ok: true, work };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
