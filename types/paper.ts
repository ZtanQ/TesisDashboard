import type { Author, Institution } from "./author";
import type { PaperMetrics } from "./metrics";

/** Fuentes academicas de las que puede provenir un dato. */
export type DataSourceName = "semantic-scholar" | "openalex" | "crossref";

export interface DataSource {
  name: DataSourceName;
  /** URL del registro consultado, para poder rastrear el dato. */
  url?: string;
  /** Momento de la consulta, en ISO 8601. */
  retrievedAt?: string;
}

/**
 * Un recuento atribuido a la fuente que lo publica.
 *
 * Existe porque las fuentes no coinciden: para el mismo articulo, Semantic
 * Scholar y OpenAlex dan cifras de citas que difieren entre un 10 y un 30 %,
 * porque indexan corpus distintos. Ninguna es "la verdadera", asi que se
 * guardan todas y la interfaz enseña la discrepancia en vez de ocultarla
 * (Plan.md, principio 5: toda metrica debe tener fuente).
 */
export interface SourcedCount {
  source: DataSourceName;
  count: number;
}

export type PublicationType =
  | "journal-article"
  | "conference-paper"
  | "book-chapter"
  | "preprint"
  | "other";

/**
 * Modelo interno de PaperLens. Toda fuente externa termina normalizada a este
 * tipo; los componentes no conocen ningun otro (Plan.md §13-14).
 *
 * Salvo `title`, `authors`, `institutions`, `countries`, `topics` y `source`,
 * todo es opcional: un campo ausente se muestra como no disponible, nunca se
 * rellena con una estimacion.
 */
export interface Paper {
  /** Id interno; solo existe una vez persistido (Fase 4). */
  id?: string;
  doi?: string;
  title: string;
  abstract?: string;
  year?: number;
  /** Fecha completa en ISO 8601 cuando la fuente la proporciona. */
  publicationDate?: string;

  /** Revista o congreso. */
  venue?: string;
  /**
   * ISSN normalizado de la revista (`issn_l` de OpenAlex).
   *
   * Es la clave con la que se buscan las metricas de revista: el nombre no
   * sirve porque cada fuente lo escribe a su manera.
   */
  venueIssn?: string;
  publisher?: string;
  publicationType?: PublicationType;

  authors: Author[];
  institutions: Institution[];
  /** Codigos ISO 3166-1 alfa-2, deduplicados. */
  countries: string[];
  topics: string[];

  /** Recuento principal, el de la fuente preferida para este articulo. */
  citationCount?: number;
  referenceCount?: number;

  /** Todos los recuentos obtenidos, uno por fuente. Puede haber uno solo. */
  citationCounts?: SourcedCount[];
  referenceCounts?: SourcedCount[];

  urls: {
    /** Pagina del articulo en el editor o en la fuente. */
    paper?: string;
    /** PDF en acceso abierto, si lo hay. */
    pdf?: string;
  };

  /** Metricas de la revista, una entrada por fuente. */
  metrics?: PaperMetrics[];

  /** De donde salio este registro. Nunca vacio. */
  source: DataSource[];
}
