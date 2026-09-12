import type {
  OpenAlexAuthorship,
  OpenAlexWork,
} from "@/lib/academic/openalex";
import type { Author, Institution } from "@/types/author";
import type {
  Biblio,
  CitationsPerYear,
  OpenAccessStatus,
  Paper,
  PublicationType,
} from "@/types/paper";

/**
 * Convierte una obra de OpenAlex al modelo interno.
 *
 * Misma regla que el resto de normalizadores: lo que la fuente no da, no se
 * rellena. Aqui hay ademas tres formas propias de OpenAlex que hay que
 * deshacer: el DOI y el ORCID llegan como URL, y el abstract como indice
 * invertido.
 */

function text(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function count(value?: number | null): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/** "https://doi.org/10.x/y" -> "10.x/y" */
function stripDoiUrl(value?: string | null): string | undefined {
  const doi = text(value);
  if (!doi) return undefined;
  return doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").toLowerCase();
}

/** "https://orcid.org/0000-..." -> "0000-..." */
function stripOrcidUrl(value?: string | null): string | undefined {
  const orcid = text(value);
  if (!orcid) return undefined;
  return orcid.replace(/^https?:\/\/orcid\.org\//i, "");
}

/**
 * Reconstruye el abstract a partir del indice invertido.
 *
 * OpenAlex lo entrega como { palabra: [posiciones] } por motivos de licencia.
 * Si el indice tiene huecos se descarta entero: media frase es peor que
 * declarar que no hay abstract.
 */
export function reconstructAbstract(
  index?: Record<string, number[]> | null,
): string | undefined {
  if (!index) return undefined;

  const words: (string | undefined)[] = [];
  let max = -1;
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions ?? []) {
      if (!Number.isInteger(position) || position < 0) continue;
      words[position] = word;
      if (position > max) max = position;
    }
  }

  if (max < 0) return undefined;
  for (let i = 0; i <= max; i++) {
    if (words[i] === undefined) return undefined;
  }

  return text(words.join(" "));
}

/** OpenAlex usa su propio vocabulario de tipos. */
function publicationType(work: OpenAlexWork): PublicationType | undefined {
  switch (work.type?.toLowerCase()) {
    case "article":
    case "journal-article":
      // `article` cubre tambien preprints; el tipo del venue lo desambigua.
      return work.primary_location?.source?.type?.toLowerCase() ===
        "repository"
        ? "preprint"
        : "journal-article";
    case "conference-paper":
    case "proceedings-article":
      return "conference-paper";
    case "book-chapter":
      return "book-chapter";
    case "preprint":
      return "preprint";
    case undefined:
      return undefined;
    default:
      return "other";
  }
}

function normalizeAuthorship(
  authorship: OpenAlexAuthorship,
  index: number,
): Author | null {
  const name = text(authorship.author?.display_name);
  if (!name) return null;

  const institutions: Institution[] = (authorship.institutions ?? [])
    .map((institution): Institution | null => {
      const institutionName = text(institution.display_name);
      if (!institutionName) return null;
      return {
        // El ROR es el identificador estable de una institucion.
        externalId: text(institution.ror) ?? text(institution.id),
        name: institutionName,
        country: text(institution.country_code)?.toUpperCase(),
      };
    })
    .filter((institution): institution is Institution => institution !== null);

  return {
    externalId: text(authorship.author?.id),
    name,
    orcid: stripOrcidUrl(authorship.author?.orcid),
    position: index + 1,
    institutions: institutions.length > 0 ? institutions : undefined,
  };
}

/** Deduplica instituciones por nombre, conservando el orden de aparicion. */
function collectInstitutions(authors: Author[]): Institution[] {
  const seen = new Set<string>();
  const institutions: Institution[] = [];
  for (const author of authors) {
    for (const institution of author.institutions ?? []) {
      const key = institution.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      institutions.push(institution);
    }
  }
  return institutions;
}

const ESTADOS_OA: OpenAccessStatus[] = [
  "gold",
  "green",
  "hybrid",
  "bronze",
  "diamond",
  "closed",
];

function openAccessStatus(valor?: string | null): OpenAccessStatus | undefined {
  const estado = text(valor)?.toLowerCase();
  return ESTADOS_OA.find((e) => e === estado);
}

/** "https://pubmed.ncbi.nlm.nih.gov/9377276" -> "9377276" */
function ultimoSegmento(url?: string | null): string | undefined {
  const valor = text(url);
  return valor?.split("/").filter(Boolean).pop();
}

export function normalizeOpenAlexWork(
  work: OpenAlexWork,
  requestedDoi: string,
): Paper {
  const authors = (work.authorships ?? [])
    .map(normalizeAuthorship)
    .filter((author): author is Author => author !== null);

  const institutions = collectInstitutions(authors);

  // Los paises se toman de `authorships[].countries` ademas de los de las
  // instituciones: OpenAlex declara el pais aunque no resuelva la institucion.
  const countries = [
    ...new Set([
      ...institutions
        .map((institution) => institution.country)
        .filter((country): country is string => Boolean(country)),
      ...(work.authorships ?? []).flatMap((authorship) =>
        (authorship.countries ?? [])
          .map((country) => text(country)?.toUpperCase())
          .filter((country): country is string => Boolean(country)),
      ),
    ]),
  ];

  const citationCount = count(work.cited_by_count);
  const referenceCount = count(work.referenced_works_count);

  return {
    doi: stripDoiUrl(work.doi) ?? requestedDoi,
    title: (text(work.title) ?? text(work.display_name))!,
    abstract: reconstructAbstract(work.abstract_inverted_index),
    year: count(work.publication_year),
    publicationDate: text(work.publication_date),
    venue: text(work.primary_location?.source?.display_name),
    venueIssn:
      text(work.primary_location?.source?.issn_l) ??
      text(work.primary_location?.source?.issn?.[0]),
    publisher: text(work.primary_location?.source?.host_organization_name),
    publicationType: publicationType(work),
    authors,
    institutions,
    countries,
    topics: (work.topics ?? [])
      .map((topic) => text(topic.display_name))
      .filter((topic): topic is string => Boolean(topic)),
    // Lo declara la fuente; `undefined` seria "no se pronuncia", que no es lo
    // mismo que "no esta retractado".
    isRetracted:
      typeof work.is_retracted === "boolean" ? work.is_retracted : undefined,
    language: text(work.language),
    biblio: ((): Biblio | undefined => {
      const b: Biblio = {
        volume: text(work.biblio?.volume),
        issue: text(work.biblio?.issue),
        firstPage: text(work.biblio?.first_page),
        lastPage: text(work.biblio?.last_page),
      };
      return Object.values(b).some(Boolean) ? b : undefined;
    })(),
    openAccessStatus: openAccessStatus(work.open_access?.oa_status),
    keywords: (work.keywords ?? [])
      .map((k) => text(k.display_name))
      .filter((k): k is string => Boolean(k)),
    citationCount,
    referenceCount,
    citationsByYear: ((): CitationsPerYear[] | undefined => {
      const serie = (work.counts_by_year ?? [])
        .map((c) => ({ year: count(c.year), count: count(c.cited_by_count) }))
        .filter(
          (c): c is CitationsPerYear =>
            c.year !== undefined && c.count !== undefined,
        )
        .sort((a, b) => a.year - b.year);
      return serie.length > 0 ? serie : undefined;
    })(),
    externalIds: ((): Paper["externalIds"] => {
      const ids = {
        pubmed: ultimoSegmento(work.ids?.["pmid"]),
        openalex: ultimoSegmento(work.ids?.["openalex"]),
      };
      return Object.values(ids).some(Boolean) ? ids : undefined;
    })(),
    citationCounts:
      citationCount === undefined
        ? undefined
        : [{ source: "openalex", count: citationCount }],
    referenceCounts:
      referenceCount === undefined
        ? undefined
        : [{ source: "openalex", count: referenceCount }],
    urls: {
      paper:
        text(work.primary_location?.landing_page_url) ??
        `https://doi.org/${requestedDoi}`,
      pdf:
        text(work.open_access?.oa_url) ??
        text(work.primary_location?.pdf_url),
    },
    // OpenAlex no publica cuartil ni factor de impacto.
    source: [
      {
        name: "openalex",
        url: text(work.id),
        retrievedAt: new Date().toISOString(),
      },
    ],
  };
}
