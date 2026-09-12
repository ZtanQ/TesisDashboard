import type {
  FoundPaper,
  SemanticScholarAuthor,
  SemanticScholarPaper,
} from "@/lib/academic/semantic-scholar";
import type { Author, Institution } from "@/types/author";
import type { Paper, PublicationType } from "@/types/paper";

/**
 * Convierte la respuesta cruda de Semantic Scholar al modelo interno.
 *
 * Regla unica de este modulo: lo que la fuente no da, no se rellena. Un campo
 * ausente se queda `undefined` y la interfaz lo declara no disponible; nunca
 * se sustituye por cero, cadena vacia ni estimacion (Plan.md, invariante 2).
 */

/** Descarta cadenas vacias o de solo espacios, que la API sí devuelve. */
function text(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Un recuento ausente no es cero: distinguirlos importa. */
function count(value?: number | null): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * `publicationVenue.type` es mas fiable que `publicationTypes`, que llega a
 * devolver ["Book","JournalArticle","Conference"] para una misma ponencia.
 */
function publicationType(
  paper: SemanticScholarPaper,
): PublicationType | undefined {
  const venueType = paper.publicationVenue?.type?.toLowerCase();
  if (venueType === "journal") return "journal-article";
  if (venueType === "conference") return "conference-paper";

  const types = paper.publicationTypes ?? [];
  if (types.includes("JournalArticle")) return "journal-article";
  if (types.includes("Conference")) return "conference-paper";
  if (types.includes("BookSection")) return "book-chapter";
  if (types.includes("Book")) return "other";
  return types.length > 0 ? "other" : undefined;
}

function orcidOf(author: SemanticScholarAuthor): string | undefined {
  const raw = author.externalIds?.["ORCID"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return text(value);
}

function normalizeAuthor(
  author: SemanticScholarAuthor,
  index: number,
): Author | null {
  const name = text(author.name);
  if (!name) return null;

  // Semantic Scholar da la afiliacion como texto libre y casi siempre vacia.
  // Se conserva el nombre pero no se infiere pais: deducirlo del texto seria
  // inventar. OpenAlex aporta institucion y pais estructurados en la fase 5.
  const institutions: Institution[] = (author.affiliations ?? [])
    .map((affiliation) => text(affiliation))
    .filter((affiliation): affiliation is string => Boolean(affiliation))
    .map((affiliation) => ({ name: affiliation }));

  return {
    externalId: text(author.authorId),
    name,
    orcid: orcidOf(author),
    position: index + 1,
    institutions: institutions.length > 0 ? institutions : undefined,
  };
}

/**
 * Topicos: `s2FieldsOfStudy` repite categorias porque las reporta una vez por
 * procedencia, asi que se deduplica conservando el orden. Son campos amplios
 * ("Computer Science"); los topicos finos llegan con OpenAlex.
 */
function normalizeTopics(paper: SemanticScholarPaper): string[] {
  const values = [
    ...(paper.s2FieldsOfStudy ?? []).map((field) => field?.category),
    ...(paper.fieldsOfStudy ?? []),
  ];

  const seen = new Set<string>();
  const topics: string[] = [];
  for (const value of values) {
    const topic = text(value);
    if (!topic || seen.has(topic.toLowerCase())) continue;
    seen.add(topic.toLowerCase());
    topics.push(topic);
  }
  return topics;
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

export function normalizeSemanticScholarPaper(
  raw: FoundPaper,
  requestedDoi: string,
): Paper {
  const authors = (raw.authors ?? [])
    .map(normalizeAuthor)
    .filter((author): author is Author => author !== null);

  const institutions = collectInstitutions(authors);

  const countries = [
    ...new Set(
      institutions
        .map((institution) => institution.country)
        .filter((country): country is string => Boolean(country)),
    ),
  ];

  const doiFromApi = raw.externalIds?.["DOI"];

  return {
    doi: text(typeof doiFromApi === "string" ? doiFromApi : undefined)?.toLowerCase() ?? requestedDoi,
    title: raw.title.trim(),
    abstract: text(raw.abstract),
    year: count(raw.year),
    publicationDate: text(raw.publicationDate),
    venue:
      text(raw.publicationVenue?.name) ??
      text(raw.venue) ??
      text(raw.journal?.name),
    publisher: text(raw.publicationVenue?.publisher),
    publicationType: publicationType(raw),
    authors,
    institutions,
    countries,
    topics: normalizeTopics(raw),
    citationCount: count(raw.citationCount),
    referenceCount: count(raw.referenceCount),
    urls: {
      paper: text(raw.url) ?? `https://doi.org/${requestedDoi}`,
      pdf: text(raw.openAccessPdf?.url),
    },
    // Semantic Scholar no publica cuartil, SJR ni factor de impacto, asi que
    // `metrics` se queda sin definir en lugar de fabricarse.
    source: [
      {
        name: "semantic-scholar",
        url: text(raw.url),
        retrievedAt: new Date().toISOString(),
      },
    ],
  };
}
