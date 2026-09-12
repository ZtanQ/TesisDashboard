/**
 * Cliente de la API de OpenAlex.
 *
 * Aporta lo que Semantic Scholar no tiene: instituciones con pais, topicos
 * especificos, editorial y nombres de autor sin mutilar. A cambio, a veces
 * trunca el titulo y omite el venue, asi que ninguna de las dos fuentes manda
 * sobre la otra (ver lib/normalization/merge.ts).
 *
 * No usa clave de API. El "polite pool" solo pide un email de contacto en el
 * parametro `mailto`, y a cambio da limites de tasa mas holgados.
 */

const API_BASE = "https://api.openalex.org";
const TIMEOUT_MS = 10_000;

// --- Forma cruda de la respuesta -------------------------------------------

export interface OpenAlexInstitution {
  id?: string | null;
  display_name?: string | null;
  ror?: string | null;
  /** ISO 3166-1 alfa-2. */
  country_code?: string | null;
}

export interface OpenAlexAuthorship {
  author_position?: string | null;
  author?: {
    id?: string | null;
    display_name?: string | null;
    /** Llega como URL completa: https://orcid.org/0000-... */
    orcid?: string | null;
  } | null;
  institutions?: OpenAlexInstitution[] | null;
  countries?: string[] | null;
}

export interface OpenAlexTopic {
  display_name?: string | null;
  score?: number | null;
}

export interface OpenAlexWork {
  id?: string | null;
  /** Llega como URL completa: https://doi.org/10.x/y */
  doi?: string | null;
  title?: string | null;
  display_name?: string | null;
  publication_year?: number | null;
  publication_date?: string | null;
  /** Vocabulario propio: "article", "conference-paper", "book-chapter"... */
  type?: string | null;
  primary_location?: {
    landing_page_url?: string | null;
    pdf_url?: string | null;
    source?: {
      display_name?: string | null;
      host_organization_name?: string | null;
      type?: string | null;
      /** ISSN normalizado de la revista: la clave para sus metricas. */
      issn_l?: string | null;
      issn?: string[] | null;
    } | null;
  } | null;
  open_access?: {
    is_oa?: boolean | null;
    oa_url?: string | null;
  } | null;
  authorships?: OpenAlexAuthorship[] | null;
  topics?: OpenAlexTopic[] | null;
  cited_by_count?: number | null;
  referenced_works_count?: number | null;
  /**
   * El abstract no viene como texto sino como indice invertido:
   * { "palabra": [posiciones] }. Se reconstruye en el normalizador.
   */
  abstract_inverted_index?: Record<string, number[]> | null;
  is_retracted?: boolean | null;
}

export type OpenAlexError = "not-found" | "rate-limited" | "unavailable";

export type OpenAlexResult =
  | { ok: true; work: OpenAlexWork }
  | { ok: false; error: OpenAlexError };

/**
 * Busca una obra por DOI. El DOI debe venir ya normalizado por `lib/doi`.
 *
 * Los fallos se devuelven como valor, no como excepcion: que un DOI no este
 * indexado es un resultado corriente.
 */
export async function fetchWorkByDoi(doi: string): Promise<OpenAlexResult> {
  const mailto = process.env.OPENALEX_MAILTO;
  const query = mailto ? `?mailto=${encodeURIComponent(mailto)}` : "";
  const url = `${API_BASE}/works/doi:${doi}${query}`;

  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Los metadatos bibliograficos apenas cambian; cachear una hora reduce
      // las llamadas. En Next 16 `fetch` no cachea por defecto.
      next: { revalidate: 3600 },
    });
  } catch {
    return { ok: false, error: "unavailable" };
  }

  if (response.status === 404) return { ok: false, error: "not-found" };
  if (response.status === 429) return { ok: false, error: "rate-limited" };
  if (!response.ok) return { ok: false, error: "unavailable" };

  try {
    const work = (await response.json()) as OpenAlexWork;
    const title = (work?.title ?? work?.display_name)?.trim();
    if (!title) return { ok: false, error: "not-found" };
    return { ok: true, work };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

// --- Metricas de la revista -------------------------------------------------

export interface OpenAlexSource {
  display_name?: string | null;
  issn_l?: string | null;
  summary_stats?: {
    h_index?: number | null;
    i10_index?: number | null;
    /**
     * Citas medias a dos anios. Misma formula que el Journal Impact Factor
     * pero sobre el corpus de OpenAlex: **no es** el JIF de Clarivate.
     */
    "2yr_mean_citedness"?: number | null;
  } | null;
}

export type OpenAlexSourceResult =
  | { ok: true; source: OpenAlexSource }
  | { ok: false; error: OpenAlexError };

/**
 * Metricas de una revista por su ISSN.
 *
 * Se busca por ISSN y no por nombre porque cada fuente escribe el nombre a su
 * manera; el ISSN es el mismo en todas.
 */
export async function fetchSourceByIssn(
  issn: string,
): Promise<OpenAlexSourceResult> {
  const mailto = process.env.OPENALEX_MAILTO;
  const query = mailto ? `?mailto=${encodeURIComponent(mailto)}` : "";
  const url = `${API_BASE}/sources/issn:${encodeURIComponent(issn)}${query}`;

  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Las metricas de una revista cambian a lo sumo una vez al anio.
      next: { revalidate: 86_400 },
    });
  } catch {
    return { ok: false, error: "unavailable" };
  }

  if (response.status === 404) return { ok: false, error: "not-found" };
  if (response.status === 429) return { ok: false, error: "rate-limited" };
  if (!response.ok) return { ok: false, error: "unavailable" };

  try {
    return { ok: true, source: (await response.json()) as OpenAlexSource };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
