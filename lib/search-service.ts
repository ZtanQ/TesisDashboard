import { resolveInput, type ResolvedInput } from "@/lib/resolve-input";

/**
 * Convierte lo que escribe el usuario en un articulo concreto, o en una lista
 * de candidatos.
 *
 * La regla que gobierna este modulo: **una busqueda por texto devuelve
 * candidatos, no una respuesta**. Elegir el primero en silencio seria afirmar
 * una identificacion que nadie ha verificado, que es justo lo que el proyecto
 * evita en todo lo demas. Solo se resuelve solo cuando hay un identificador.
 */

const CROSSREF_API = "https://api.crossref.org";
const OPENALEX_API = "https://api.openalex.org";
const SEMANTIC_SCHOLAR_API = "https://api.semanticscholar.org/graph/v1";
const TIMEOUT_MS = 10_000;

export interface Candidate {
  doi: string;
  title: string;
  year?: number;
  venue?: string;
  authors: string[];
  citationCount?: number;
}

export type SearchOutcome =
  /** Identificado sin ambiguedad: se puede ir directo a su ficha. */
  | { kind: "doi"; doi: string }
  /** Hay que elegir entre estos. */
  | {
      kind: "candidates";
      candidates: Candidate[];
      query: string;
      /** Fuentes que no respondieron: la lista puede estar incompleta. */
      missingSources: string[];
    }
  /** Se entendio la entrada pero no se encontro nada. */
  | { kind: "not-found"; detail: string }
  | { kind: "empty" };

function texto(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.trim() ? valor.trim() : undefined;
}

async function pedir(url: string, headers?: HeadersInit): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/** El DOI de un articulo de arXiv, si es que tiene uno. */
async function doiDeArxiv(id: string): Promise<{ doi?: string; title?: string }> {
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  const json = (await pedir(
    `${SEMANTIC_SCHOLAR_API}/paper/ARXIV:${encodeURIComponent(id)}?fields=title,externalIds`,
    apiKey ? { "x-api-key": apiKey } : undefined,
  )) as { title?: string; externalIds?: Record<string, string> } | null;

  if (!json) return {};
  return {
    doi: texto(json.externalIds?.["DOI"])?.toLowerCase(),
    title: texto(json.title),
  };
}

/** El DOI de un articulo de PubMed. OpenAlex resuelve `pmid:` directamente. */
async function doiDePmid(id: string): Promise<{ doi?: string; title?: string }> {
  const json = (await pedir(
    `${OPENALEX_API}/works/pmid:${encodeURIComponent(id)}`,
  )) as { doi?: string; title?: string } | null;

  if (!json) return {};
  return {
    doi: texto(json.doi)
      ?.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
      .toLowerCase(),
    title: texto(json.title),
  };
}

/**
 * Busca por titulo en Crossref, que es quien mejor puntua la coincidencia
 * bibliografica: para "Long Short-Term Memory" el articulo correcto sale
 * primero con 53 puntos frente a 38 del siguiente.
 */
async function buscarEnCrossref(query: string): Promise<Candidate[]> {
  const email = process.env.CROSSREF_EMAIL;
  const json = (await pedir(
    `${CROSSREF_API}/works?query.bibliographic=${encodeURIComponent(query)}&rows=8` +
      `&select=DOI,title,issued,container-title,author,is-referenced-by-count`,
    {
      "User-Agent": email ? `PaperLens/0.1 (mailto:${email})` : "PaperLens/0.1",
    },
  )) as { message?: { items?: Record<string, unknown>[] } } | null;

  return (json?.message?.items ?? [])
    .map((item): Candidate | null => {
      const doi = texto(item.DOI)?.toLowerCase();
      const title = texto((item.title as string[] | undefined)?.[0]);
      if (!doi || !title) return null;

      const issued = item.issued as { "date-parts"?: number[][] } | undefined;
      const autores = (
        item.author as { given?: string; family?: string }[] | undefined
      )?.slice(0, 6);

      return {
        doi,
        title,
        year: issued?.["date-parts"]?.[0]?.[0],
        venue: texto((item["container-title"] as string[] | undefined)?.[0]),
        authors: (autores ?? [])
          .map((a) => [a.given, a.family].filter(Boolean).join(" ").trim())
          .filter(Boolean),
        citationCount:
          typeof item["is-referenced-by-count"] === "number"
            ? (item["is-referenced-by-count"] as number)
            : undefined,
      };
    })
    .filter((c): c is Candidate => c !== null);
}

/**
 * Busca por titulo en OpenAlex.
 *
 * Hace falta ademas de Crossref porque Crossref indexa mal las actas de
 * congreso y los preprints: para "Attention Is All You Need" no devuelve el
 * articulo correcto y OpenAlex si. Se ordena por citas, que para un titulo
 * concreto suele poner delante la version de referencia.
 */
async function buscarEnOpenAlex(query: string): Promise<Candidate[]> {
  const mailto = process.env.OPENALEX_MAILTO;
  const json = (await pedir(
    `${OPENALEX_API}/works?filter=title.search:${encodeURIComponent(query)}` +
      `&sort=cited_by_count:desc&per-page=6` +
      `&select=doi,title,publication_year,cited_by_count,primary_location,authorships` +
      (mailto ? `&mailto=${encodeURIComponent(mailto)}` : ""),
  )) as { results?: Record<string, unknown>[] } | null;

  return (json?.results ?? [])
    .map((item): Candidate | null => {
      const doi = texto(item.doi)
        ?.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
        .toLowerCase();
      const title = texto(item.title);
      if (!doi || !title) return null;

      const location = item.primary_location as
        | { source?: { display_name?: string } }
        | undefined;
      const authorships = item.authorships as
        | { author?: { display_name?: string } }[]
        | undefined;

      return {
        doi,
        title,
        year:
          typeof item.publication_year === "number"
            ? item.publication_year
            : undefined,
        venue: texto(location?.source?.display_name),
        authors: (authorships ?? [])
          .slice(0, 6)
          .map((a) => texto(a.author?.display_name))
          .filter((n): n is string => Boolean(n)),
        citationCount:
          typeof item.cited_by_count === "number"
            ? item.cited_by_count
            : undefined,
      };
    })
    .filter((c): c is Candidate => c !== null);
}

/**
 * Candidatos de las dos fuentes, sin repetir DOI.
 *
 * Se consultan ambas porque se complementan: Crossref puntua muy bien la
 * coincidencia bibliografica de articulos de revista, y OpenAlex cubre
 * congresos y preprints que Crossref no indexa. Se alternan para que ninguna
 * fuente monopolice los primeros puestos.
 */
async function buscarCandidatos(
  query: string,
): Promise<{ candidates: Candidate[]; missingSources: string[] }> {
  const [openAlex, crossref] = await Promise.all([
    buscarEnOpenAlex(query),
    buscarEnCrossref(query),
  ]);

  // Que una fuente no responda se dice, no se oculta: OpenAlex limita las
  // busquedas anonimas bajo carga y su ausencia cambia que articulos salen.
  const missingSources = [
    openAlex.length === 0 ? "OpenAlex" : null,
    crossref.length === 0 ? "Crossref" : null,
  ].filter((s): s is string => s !== null);

  const vistos = new Set<string>();
  const salida: Candidate[] = [];
  const maximo = Math.max(openAlex.length, crossref.length);

  for (let i = 0; i < maximo; i++) {
    for (const lista of [openAlex, crossref]) {
      const candidato = lista[i];
      if (!candidato || vistos.has(candidato.doi)) continue;
      vistos.add(candidato.doi);
      salida.push(candidato);
    }
  }

  return { candidates: salida.slice(0, 10), missingSources };
}

/** Resuelve una entrada ya interpretada. */
async function resolver(entrada: ResolvedInput): Promise<SearchOutcome> {
  switch (entrada.kind) {
    case "empty":
      return { kind: "empty" };

    case "doi":
      return { kind: "doi", doi: entrada.doi };

    case "arxiv":
    case "pmid": {
      const { doi, title } =
        entrada.kind === "arxiv"
          ? await doiDeArxiv(entrada.id)
          : await doiDePmid(entrada.id);

      if (doi) return { kind: "doi", doi };

      // Hay articulos —sobre todo preprints de arXiv— que no tienen DOI. Se
      // busca por su titulo en vez de dar la entrada por imposible.
      if (title) {
        const { candidates, missingSources } = await buscarCandidatos(title);
        if (candidates.length > 0) {
          return { kind: "candidates", candidates, query: title, missingSources };
        }
      }

      return {
        kind: "not-found",
        detail:
          entrada.kind === "arxiv"
            ? "Encontramos el preprint en arXiv, pero no tiene DOI ni una versión publicada que podamos localizar."
            : "No encontramos ese identificador de PubMed.",
      };
    }

    case "search": {
      const { candidates, missingSources } = await buscarCandidatos(entrada.query);
      if (candidates.length === 0) {
        return {
          kind: "not-found",
          detail:
            "No encontramos ningún artículo con ese texto. Prueba con el DOI o con el título completo.",
        };
      }
      return {
        kind: "candidates",
        candidates,
        query: entrada.query,
        missingSources,
      };
    }
  }
}

/** Punto de entrada: de lo que escribe el usuario a un articulo o candidatos. */
export async function search(entrada: string): Promise<SearchOutcome> {
  return resolver(resolveInput(entrada));
}
