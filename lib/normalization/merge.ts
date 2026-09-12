import type { Author, Institution } from "@/types/author";
import type { Paper, SourcedCount } from "@/types/paper";
import type { PaperMetrics } from "@/types/metrics";

/**
 * Combina el mismo articulo visto por varias fuentes.
 *
 * Ninguna fuente manda sobre la otra: cada una es mejor en unas cosas y peor
 * en otras, y esto se comprobo contra las APIs reales.
 *
 *   - OpenAlex aporta instituciones con pais, topicos especificos, editorial,
 *     abstract y nombres de autor sin mutilar (Semantic Scholar devuelve
 *     "Jrgen Schmidhuber" donde OpenAlex devuelve "Jürgen Schmidhuber").
 *   - Semantic Scholar aporta el venue y el titulo completo cuando OpenAlex lo
 *     trunca (OpenAlex llama "Optuna" a un articulo cuyo titulo real es
 *     "Optuna: A Next-generation Hyperparameter Optimization Framework").
 *
 * El orden de los argumentos fija la preferencia: gana el primero que tenga
 * un valor, salvo en los campos con regla propia documentada abajo.
 */

/** Primer valor definido, en orden de preferencia. */
function first<T>(...values: (T | undefined)[]): T | undefined {
  return values.find((value) => value !== undefined);
}

/**
 * Para titulo y abstract gana el texto mas largo, no el de una fuente fija.
 *
 * El fallo observado es el truncamiento, y el texto mas largo es el que no
 * esta truncado. No mezcla: elige uno de los dos tal cual.
 */
function longest(...values: (string | undefined)[]): string | undefined {
  const present = values.filter((value): value is string => Boolean(value));
  if (present.length === 0) return undefined;
  return present.reduce((a, b) => (b.length > a.length ? b : a));
}

/** Une listas de nombres deduplicando sin distinguir mayusculas. */
function mergeNames(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of lists) {
    for (const value of list) {
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

function mergeInstitutions(...lists: Institution[][]): Institution[] {
  const byName = new Map<string, Institution>();
  for (const list of lists) {
    for (const institution of list) {
      const key = institution.name.toLowerCase();
      const previous = byName.get(key);
      if (!previous) {
        byName.set(key, institution);
        continue;
      }
      // Se completa el hueco sin sobrescribir lo que ya habia.
      byName.set(key, {
        externalId: previous.externalId ?? institution.externalId,
        name: previous.name,
        country: previous.country ?? institution.country,
      });
    }
  }
  return [...byName.values()];
}

/**
 * Los autores se emparejan por posicion de firma, que es lo unico comparable
 * entre fuentes: los identificadores son propios de cada una y los nombres
 * pueden venir mutilados, asi que no sirven como clave.
 *
 * Se conserva la lista mas larga; en cada posicion, el nombre gana la fuente
 * preferida y los datos ausentes se completan con la otra.
 */
function mergeAuthors(preferred: Author[], secondary: Author[]): Author[] {
  const base = preferred.length >= secondary.length ? preferred : secondary;
  const other = base === preferred ? secondary : preferred;

  return base.map((author, index) => {
    const counterpart = other[index];
    if (!counterpart) return author;

    // El nombre se toma de la fuente preferida aunque `base` sea la otra.
    const fromPreferred = base === preferred ? author : counterpart;
    const fromSecondary = base === preferred ? counterpart : author;

    return {
      externalId: fromPreferred.externalId ?? fromSecondary.externalId,
      name: fromPreferred.name,
      orcid: fromPreferred.orcid ?? fromSecondary.orcid,
      position: fromPreferred.position ?? fromSecondary.position,
      institutions:
        fromPreferred.institutions && fromPreferred.institutions.length > 0
          ? fromPreferred.institutions
          : fromSecondary.institutions,
    };
  });
}

/** Une los recuentos de todas las fuentes, sin repetir fuente. */
function mergeCounts(
  ...lists: (SourcedCount[] | undefined)[]
): SourcedCount[] | undefined {
  const seen = new Set<string>();
  const result: SourcedCount[] = [];
  for (const list of lists) {
    for (const entry of list ?? []) {
      if (seen.has(entry.source)) continue;
      seen.add(entry.source);
      result.push(entry);
    }
  }
  return result.length > 0 ? result : undefined;
}

/**
 * Une metricas de revista sin repetir la pareja (fuente, anio).
 *
 * No se eligen unas u otras: SCImago publica cuartil y SJR, OpenAlex indice h
 * y citas medias a dos anios. Son cosas distintas y ninguna sustituye a la
 * otra, asi que se conservan todas con su procedencia.
 */
function mergeMetrics(
  ...listas: (PaperMetrics[] | undefined)[]
): PaperMetrics[] | undefined {
  const vistas = new Set<string>();
  const salida: PaperMetrics[] = [];
  for (const lista of listas) {
    for (const metrica of lista ?? []) {
      const clave = `${metrica.source}:${metrica.year}`;
      if (vistas.has(clave)) continue;
      vistas.add(clave);
      salida.push(metrica);
    }
  }
  return salida.length > 0 ? salida : undefined;
}

/**
 * Fusiona dos vistas del mismo articulo. `preferred` es la fuente que manda
 * en los empates; `secondary` rellena huecos.
 */
export function mergePapers(preferred: Paper, secondary: Paper): Paper {
  const authors = mergeAuthors(preferred.authors, secondary.authors);

  const institutions = mergeInstitutions(
    preferred.institutions,
    secondary.institutions,
  );

  return {
    doi: first(preferred.doi, secondary.doi),
    // El truncamiento es el fallo observado, asi que gana el titulo completo.
    title: longest(preferred.title, secondary.title) ?? preferred.title,
    abstract: longest(preferred.abstract, secondary.abstract),
    year: first(preferred.year, secondary.year),
    publicationDate: first(preferred.publicationDate, secondary.publicationDate),
    venue: first(preferred.venue, secondary.venue),
    venueIssn: first(preferred.venueIssn, secondary.venueIssn),
    publisher: first(preferred.publisher, secondary.publisher),
    publicationType: first(
      preferred.publicationType,
      secondary.publicationType,
    ),
    authors,
    institutions,
    countries: mergeNames(preferred.countries, secondary.countries),
    topics: mergeNames(preferred.topics, secondary.topics),
    keywords: mergeNames(preferred.keywords, secondary.keywords),
    // Que una fuente lo marque como retractado basta: es un aviso, y
    // perderlo porque la otra no se pronuncia seria lo peor que podria pasar.
    isRetracted:
      preferred.isRetracted === true || secondary.isRetracted === true
        ? true
        : first(preferred.isRetracted, secondary.isRetracted),
    language: first(preferred.language, secondary.language),
    biblio: first(preferred.biblio, secondary.biblio),
    openAccessStatus: first(
      preferred.openAccessStatus,
      secondary.openAccessStatus,
    ),
    citationsByYear: first(
      preferred.citationsByYear,
      secondary.citationsByYear,
    ),
    externalIds:
      preferred.externalIds || secondary.externalIds
        ? { ...secondary.externalIds, ...preferred.externalIds }
        : undefined,
    // El recuento principal es el de la fuente preferida, pero se conservan
    // todos: difieren entre si y la interfaz enseña la discrepancia.
    citationCount: first(preferred.citationCount, secondary.citationCount),
    referenceCount: first(preferred.referenceCount, secondary.referenceCount),
    citationCounts: mergeCounts(
      preferred.citationCounts,
      secondary.citationCounts,
    ),
    referenceCounts: mergeCounts(
      preferred.referenceCounts,
      secondary.referenceCounts,
    ),
    urls: {
      paper: first(preferred.urls.paper, secondary.urls.paper),
      pdf: first(preferred.urls.pdf, secondary.urls.pdf),
    },
    // Las metricas se unen por fuente: SCImago y OpenAlex publican cosas
    // distintas y ninguna sustituye a la otra.
    metrics: mergeMetrics(preferred.metrics, secondary.metrics),
    source: [...preferred.source, ...secondary.source],
  };
}
