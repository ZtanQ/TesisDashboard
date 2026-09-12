import type {
  CrossrefAuthor,
  CrossrefWork,
} from "@/lib/academic/crossref";
import type { Author, Institution } from "@/types/author";
import type { Biblio, Paper, PublicationType } from "@/types/paper";

/**
 * Convierte la ficha de Crossref al modelo interno.
 *
 * Crossref es el registro del editor, no un indice de citas: aporta sobre todo
 * editorial, volumen, paginas, licencia y referencias. Su recuento de citas
 * existe pero es el mas bajo de los tres, porque solo cuenta lo depositado en
 * Crossref; se conserva con su procedencia como los demas.
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

/** El abstract de Crossref viene en JATS XML; se quitan las etiquetas. */
function limpiarAbstract(valor?: string | null): string | undefined {
  const bruto = text(valor);
  if (!bruto) return undefined;
  // El trim va antes de quitar el "Abstract" inicial: al sustituir las
  // etiquetas por espacios, el texto empieza por uno y el ancla no casaria.
  return text(
    bruto
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^Abstract[:.\s]*/i, ""),
  );
}

/** Crossref usa su propio vocabulario de tipos. */
function publicationType(work: CrossrefWork): PublicationType | undefined {
  switch (work.type?.toLowerCase()) {
    case "journal-article":
      return "journal-article";
    case "proceedings-article":
      return "conference-paper";
    case "book-chapter":
      return "book-chapter";
    case "posted-content":
      return "preprint";
    case undefined:
      return undefined;
    default:
      return "other";
  }
}

function normalizeAuthor(
  autor: CrossrefAuthor,
  index: number,
): Author | null {
  const nombre =
    text(autor.name) ??
    [text(autor.given), text(autor.family)].filter(Boolean).join(" ");
  if (!nombre) return null;

  const institutions: Institution[] = (autor.affiliation ?? [])
    .map((a) => text(a.name))
    .filter((n): n is string => Boolean(n))
    .map((name) => ({ name }));

  return {
    name: nombre,
    // Crossref da el ORCID como URL completa.
    orcid: text(autor.ORCID)?.replace(/^https?:\/\/orcid\.org\//i, ""),
    position: index + 1,
    institutions: institutions.length > 0 ? institutions : undefined,
  };
}

function collectInstitutions(authors: Author[]): Institution[] {
  const vistas = new Set<string>();
  const salida: Institution[] = [];
  for (const autor of authors) {
    for (const institucion of autor.institutions ?? []) {
      const clave = institucion.name.toLowerCase();
      if (vistas.has(clave)) continue;
      vistas.add(clave);
      salida.push(institucion);
    }
  }
  return salida;
}

/** "[[1997, 11, 1]]" -> "1997-11-01" */
function fecha(work: CrossrefWork): string | undefined {
  const partes = work.issued?.["date-parts"]?.[0];
  if (!partes || partes.length === 0) return undefined;
  const [anio, mes = 1, dia = 1] = partes;
  if (!anio) return undefined;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function biblio(work: CrossrefWork): Biblio | undefined {
  const [primera, ultima] = (text(work.page) ?? "").split("-");
  const b: Biblio = {
    volume: text(work.volume),
    issue: text(work.issue),
    firstPage: text(primera),
    lastPage: text(ultima),
  };
  return Object.values(b).some(Boolean) ? b : undefined;
}

export function normalizeCrossrefWork(
  work: CrossrefWork,
  requestedDoi: string,
): Paper {
  const authors = (work.author ?? [])
    .map(normalizeAuthor)
    .filter((a): a is Author => a !== null);

  const institutions = collectInstitutions(authors);
  const citationCount = count(work["is-referenced-by-count"]);
  const referenceCount =
    count(work["references-count"]) ?? count(work.reference?.length);

  return {
    doi: text(work.DOI)?.toLowerCase() ?? requestedDoi,
    title: text(work.title?.[0])!,
    abstract: limpiarAbstract(work.abstract),
    year: count(work.issued?.["date-parts"]?.[0]?.[0]),
    publicationDate: fecha(work),
    venue: text(work["container-title"]?.[0]),
    venueIssn: text(work.ISSN?.[0]),
    publisher: text(work.publisher),
    publicationType: publicationType(work),
    authors,
    institutions,
    // Crossref no declara paises de forma estructurada.
    countries: [],
    // `subject` son categorias amplias del editor; sirven como topicos.
    topics: (work.subject ?? [])
      .map((s) => text(s))
      .filter((s): s is string => Boolean(s)),
    keywords: [],
    language: text(work.language),
    biblio: biblio(work),
    citationCount,
    referenceCount,
    citationCounts:
      citationCount === undefined
        ? undefined
        : [{ source: "crossref", count: citationCount }],
    referenceCounts:
      referenceCount === undefined
        ? undefined
        : [{ source: "crossref", count: referenceCount }],
    urls: {
      paper: text(work.URL) ?? `https://doi.org/${requestedDoi}`,
    },
    source: [
      {
        name: "crossref",
        url: text(work.URL),
        retrievedAt: new Date().toISOString(),
      },
    ],
  };
}
