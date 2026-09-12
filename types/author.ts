/** Una institucion tal como la reporta una fuente academica. */
export interface Institution {
  /** Identificador en la fuente de origen (ROR, OpenAlex id, etc.). */
  externalId?: string;
  name: string;
  /** Codigo ISO 3166-1 alfa-2 en mayusculas, p. ej. "PE". */
  country?: string;
}

export interface Author {
  /** Identificador en la fuente de origen (authorId de Semantic Scholar, etc.). */
  externalId?: string;
  name: string;
  orcid?: string;
  /** Posicion en la lista de firmantes, empezando en 1. */
  position?: number;
  /** Afiliaciones declaradas en este articulo concreto. */
  institutions?: Institution[];
}
