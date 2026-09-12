/**
 * Cliente de la Academic Graph API de Semantic Scholar.
 *
 * Solo habla con la API y devuelve su forma cruda: la conversion al modelo
 * interno vive en `lib/normalization/semantic-scholar.ts`. Asi, anadir otra
 * fuente no obliga a tocar nada de lo que hay aguas abajo (Plan.md §25).
 *
 * La clave de API es opcional. Sin ella se usa el pool anonimo, que esta muy
 * limitado y devuelve 429 con facilidad; por eso ese caso tiene su propio
 * codigo de error en vez de mezclarse con "fuente caida".
 */

const API_BASE = "https://api.semanticscholar.org/graph/v1";

/** Campos que pide PaperLens. Pedir de menos es mas rapido y mas estable. */
const PAPER_FIELDS = [
  "externalIds",
  "title",
  "abstract",
  "year",
  "publicationDate",
  "venue",
  "publicationVenue",
  "journal",
  "publicationTypes",
  "fieldsOfStudy",
  "s2FieldsOfStudy",
  "citationCount",
  "referenceCount",
  "isOpenAccess",
  "openAccessPdf",
  "url",
  "authors.authorId",
  "authors.name",
  "authors.affiliations",
  "authors.externalIds",
].join(",");

const TIMEOUT_MS = 10_000;

// --- Forma cruda de la respuesta -------------------------------------------
// Casi todo es opcional: la API omite los campos que no tiene para un paper.

export interface SemanticScholarAuthor {
  authorId?: string | null;
  name?: string | null;
  /** En la practica llega casi siempre vacio; OpenAlex lo cubre en la fase 5. */
  affiliations?: string[] | null;
  externalIds?: Record<string, string[] | string> | null;
}

export interface SemanticScholarPaper {
  paperId?: string;
  externalIds?: Record<string, string | number> | null;
  title?: string | null;
  abstract?: string | null;
  year?: number | null;
  publicationDate?: string | null;
  venue?: string | null;
  publicationVenue?: {
    name?: string | null;
    type?: string | null;
    publisher?: string | null;
  } | null;
  journal?: { name?: string | null } | null;
  publicationTypes?: string[] | null;
  fieldsOfStudy?: string[] | null;
  s2FieldsOfStudy?: { category?: string | null; source?: string | null }[] | null;
  citationCount?: number | null;
  referenceCount?: number | null;
  isOpenAccess?: boolean | null;
  /** `url` puede venir como cadena vacia cuando no hay PDF abierto. */
  openAccessPdf?: { url?: string | null; status?: string | null } | null;
  url?: string | null;
  authors?: SemanticScholarAuthor[] | null;
}

export type SemanticScholarError =
  | "not-found"
  | "rate-limited"
  | "unavailable";

export type SemanticScholarResult =
  | { ok: true; paper: SemanticScholarPaper }
  | { ok: false; error: SemanticScholarError };

/**
 * Busca un articulo por DOI. El DOI debe venir ya normalizado por `lib/doi`.
 *
 * Los fallos se devuelven como valor, no como excepcion: que un DOI no este
 * indexado es un resultado corriente, no un error de programa.
 */
export async function fetchPaperByDoi(
  doi: string,
): Promise<SemanticScholarResult> {
  const url = `${API_BASE}/paper/DOI:${doi}?fields=${PAPER_FIELDS}`;
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: apiKey ? { "x-api-key": apiKey } : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Los metadatos bibliograficos apenas cambian, y cachear una hora quita
      // presion al limite de tasa. En Next 16 `fetch` no cachea por defecto.
      next: { revalidate: 3600 },
    });
  } catch {
    // Timeout, DNS, sin red.
    return { ok: false, error: "unavailable" };
  }

  if (response.status === 404) return { ok: false, error: "not-found" };
  if (response.status === 429) return { ok: false, error: "rate-limited" };
  if (!response.ok) return { ok: false, error: "unavailable" };

  try {
    const paper = (await response.json()) as SemanticScholarPaper;
    // Un 200 sin titulo no es un articulo utilizable.
    if (!paper?.title) return { ok: false, error: "not-found" };
    return { ok: true, paper };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
