import type { Paper } from "@/types/paper";
import { findQuartile, type Quartile } from "@/types/metrics";

/**
 * Agregados de la biblioteca completa.
 *
 * Todo es recuento sobre datos ya guardados. Lo que no consta se cuenta como
 * "sin dato" y se enseña, en lugar de desaparecer del total: un grafico que
 * omite los huecos hace parecer que no los hay.
 */

export interface LibrarySummary {
  papers: number;
  /** Autores distintos. Ver la nota de `contarAutores` sobre su precision. */
  authors: number;
  institutions: number;
  countries: number;
  topics: number;
  /** Suma de citas de los articulos que la publican. */
  citations: number;
  /** Articulos sin recuento de citas, excluidos de la suma. */
  papersWithoutCitations: number;
}

export interface Bucket {
  label: string;
  count: number;
}

function clave(valor: string): string {
  return valor.trim().toLowerCase();
}

/**
 * Autores distintos.
 *
 * Se identifican por su id de fuente cuando lo tienen y por nombre cuando no.
 * El recuento por nombre no es exacto —dos personas pueden llamarse igual, y
 * la misma persona aparecer como "A. Ruiz" y "Ana Ruiz"—, asi que esta cifra
 * es una aproximacion y la interfaz debe decirlo.
 */
function contarAutores(papers: Paper[]): number {
  const vistos = new Set<string>();
  for (const paper of papers) {
    for (const autor of paper.authors) {
      vistos.add(autor.externalId ?? clave(autor.name));
    }
  }
  return vistos.size;
}

export function summarize(papers: Paper[]): LibrarySummary {
  const instituciones = new Set<string>();
  const paises = new Set<string>();
  const topicos = new Set<string>();
  let citations = 0;
  let papersWithoutCitations = 0;

  for (const paper of papers) {
    for (const institucion of paper.institutions) {
      instituciones.add(clave(institucion.name));
    }
    for (const pais of paper.countries) paises.add(pais);
    for (const topico of paper.topics) topicos.add(clave(topico));

    if (paper.citationCount === undefined) papersWithoutCitations++;
    else citations += paper.citationCount;
  }

  return {
    papers: papers.length,
    authors: contarAutores(papers),
    institutions: instituciones.size,
    countries: paises.size,
    topics: topicos.size,
    citations,
    papersWithoutCitations,
  };
}

/**
 * Articulos por anio, **incluyendo los anios sin ninguno**.
 *
 * Omitir los huecos comprime el eje y hace parecer continua una distribucion
 * que no lo es: con articulos de 1997 y 2019, sin los ceros intermedios
 * parecerian consecutivos.
 */
export function papersByYear(papers: Paper[]): Bucket[] {
  const conAnio = papers.filter(
    (paper): paper is Paper & { year: number } => paper.year !== undefined,
  );
  if (conAnio.length === 0) return [];

  const cuenta = new Map<number, number>();
  for (const paper of conAnio) {
    cuenta.set(paper.year, (cuenta.get(paper.year) ?? 0) + 1);
  }

  const min = Math.min(...cuenta.keys());
  const max = Math.max(...cuenta.keys());

  const salida: Bucket[] = [];
  for (let anio = min; anio <= max; anio++) {
    salida.push({ label: String(anio), count: cuenta.get(anio) ?? 0 });
  }
  return salida;
}

/** Articulos sin anio declarado, que no caben en el grafico temporal. */
export function papersWithoutYear(papers: Paper[]): number {
  return papers.filter((paper) => paper.year === undefined).length;
}

const CUARTILES: Quartile[] = ["Q1", "Q2", "Q3", "Q4"];

/**
 * Reparto por cuartil, con "sin dato" siempre presente.
 *
 * Hoy ninguna fuente integrada publica cuartil, asi que todos caeran en "sin
 * dato". Enseñarlo es el comportamiento correcto: el grafico dice la verdad
 * sobre lo que se sabe.
 */
export function byQuartile(papers: Paper[]): Bucket[] {
  const cuenta = new Map<string, number>();
  for (const cuartil of CUARTILES) cuenta.set(cuartil, 0);
  cuenta.set("Sin dato", 0);

  for (const paper of papers) {
    const cuartil = findQuartile(paper.metrics)?.quartile;
    const etiqueta = cuartil ?? "Sin dato";
    cuenta.set(etiqueta, (cuenta.get(etiqueta) ?? 0) + 1);
  }

  return [...cuenta.entries()].map(([label, count]) => ({ label, count }));
}

/** Ranking generico: cuenta apariciones y ordena de mas a menos. */
function ranking(
  papers: Paper[],
  extraer: (paper: Paper) => string[],
  limite: number,
): Bucket[] {
  const cuenta = new Map<string, Bucket>();

  for (const paper of papers) {
    // Un articulo cuenta una vez por valor aunque lo repita.
    const valores = extraer(paper);
    const unicos = new Map<string, string>();
    for (const valor of valores) {
      const k = clave(valor);
      if (!unicos.has(k)) unicos.set(k, valor);
    }

    for (const [k, original] of unicos) {
      const previo = cuenta.get(k);
      if (previo) previo.count++;
      else cuenta.set(k, { label: original, count: 1 });
    }
  }

  return [...cuenta.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"))
    .slice(0, limite);
}

export function topTopics(papers: Paper[], limite = 12): Bucket[] {
  return ranking(papers, (paper) => paper.topics, limite);
}

export function topInstitutions(papers: Paper[], limite = 12): Bucket[] {
  return ranking(
    papers,
    (paper) => paper.institutions.map((institucion) => institucion.name),
    limite,
  );
}

export function topCountries(papers: Paper[], limite = 12): Bucket[] {
  return ranking(papers, (paper) => paper.countries, limite);
}

export function topAuthors(papers: Paper[], limite = 12): Bucket[] {
  return ranking(
    papers,
    (paper) => paper.authors.map((autor) => autor.name),
    limite,
  );
}
