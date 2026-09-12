import type { Paper } from "@/types/paper";
import type { PaperAnalysis } from "@/types/analysis";

/**
 * Comparacion de varios articulos de la biblioteca.
 *
 * Todo lo de aqui es aritmetica sobre datos ya obtenidos: no infiere nada ni
 * puntua articulos. Lo que una fuente no publica sigue sin publicarse al
 * comparar, y una celda vacia en la tabla significa eso.
 */

export interface ComparedPaper {
  paper: Paper;
  /** Analisis por IA, si ese articulo tiene uno guardado. */
  analysis: PaperAnalysis | null;
}

export interface TopicBreakdown {
  /** Topicos presentes en TODOS los articulos comparados. */
  shared: string[];
  /** Por DOI, los topicos que solo tiene ese articulo. */
  uniqueByDoi: Record<string, string[]>;
}

/** Compara sin distinguir mayusculas, pero conserva la grafia original. */
function clave(valor: string): string {
  return valor.trim().toLowerCase();
}

/**
 * Topicos comunes y exclusivos.
 *
 * Con un solo articulo no hay nada "compartido": la interseccion de un
 * conjunto consigo mismo seria todo, lo que induce a error. Se devuelve vacio.
 */
export function compareTopics(papers: ComparedPaper[]): TopicBreakdown {
  const uniqueByDoi: Record<string, string[]> = {};
  if (papers.length === 0) return { shared: [], uniqueByDoi };

  const conjuntos = papers.map(
    ({ paper }) => new Set(paper.topics.map(clave)),
  );

  const shared =
    papers.length < 2
      ? []
      : papers[0].paper.topics.filter((topic) =>
          conjuntos.every((conjunto) => conjunto.has(clave(topic))),
        );

  papers.forEach(({ paper }, indice) => {
    const otros = conjuntos.filter((_, i) => i !== indice);
    uniqueByDoi[paper.doi ?? ""] = paper.topics.filter(
      (topic) => !otros.some((conjunto) => conjunto.has(clave(topic))),
    );
  });

  return { shared, uniqueByDoi };
}

/** Union de paises, sin repetir, en orden de aparicion. */
export function unionCountries(papers: ComparedPaper[]): string[] {
  const vistos = new Set<string>();
  const salida: string[] = [];
  for (const { paper } of papers) {
    for (const pais of paper.countries) {
      if (vistos.has(pais)) continue;
      vistos.add(pais);
      salida.push(pais);
    }
  }
  return salida;
}

export interface NumericSpread {
  min: number;
  max: number;
  /** Cuantos articulos no publican el dato. Se dice, no se rellena con cero. */
  missing: number;
}

/**
 * Rango de un valor numerico entre los articulos comparados.
 *
 * Devuelve `null` si ningun articulo tiene el dato: un rango de nada no es
 * cero, es ausencia.
 */
export function spread(
  papers: ComparedPaper[],
  pick: (paper: Paper) => number | undefined,
): NumericSpread | null {
  const valores: number[] = [];
  let missing = 0;

  for (const { paper } of papers) {
    const valor = pick(paper);
    if (valor === undefined) missing++;
    else valores.push(valor);
  }

  if (valores.length === 0) return null;
  return { min: Math.min(...valores), max: Math.max(...valores), missing };
}

/**
 * Metodologia de cada articulo segun su analisis por IA.
 *
 * Es lo unico de la comparacion que no sale de una fuente bibliografica, asi
 * que se devuelve identificado como interpretacion y la interfaz lo marca.
 * `null` cubre dos casos distintos que no conviene confundir: no haber
 * analizado el articulo, y haberlo analizado sin que declarase metodologia.
 */
export function methodologies(
  papers: ComparedPaper[],
): { doi: string; methodology: string | null; analyzed: boolean }[] {
  return papers.map(({ paper, analysis }) => ({
    doi: paper.doi ?? "",
    methodology: analysis?.methodology ?? null,
    analyzed: analysis !== null,
  }));
}

/** Cuantos articulos comparten cada tópico, de mas comun a menos. */
export function topicFrequency(
  papers: ComparedPaper[],
): { topic: string; count: number }[] {
  const cuenta = new Map<string, { topic: string; count: number }>();

  for (const { paper } of papers) {
    // Un articulo cuenta una vez por topico aunque lo repita.
    for (const topic of new Set(paper.topics.map(clave))) {
      const original =
        paper.topics.find((t) => clave(t) === topic) ?? topic;
      const previo = cuenta.get(topic);
      if (previo) previo.count++;
      else cuenta.set(topic, { topic: original, count: 1 });
    }
  }

  return [...cuenta.values()].sort(
    (a, b) => b.count - a.count || a.topic.localeCompare(b.topic, "es"),
  );
}
