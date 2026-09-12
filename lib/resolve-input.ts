import { normalizeDoi } from "@/lib/doi";

/**
 * Interpreta lo que el usuario escribe en la caja de busqueda.
 *
 * Acepta DOI, enlaces y texto libre. La resolucion es puramente sintactica:
 * **no se descarga ninguna pagina**. Se probo, y las grandes editoriales
 * (ScienceDirect, MIT Press) devuelven 403 a las peticiones automaticas, asi
 * que bajar la pagina para leer su `citation_doi` seria poco fiable ademas de
 * abrir la puerta a que el servidor visite cualquier URL que le pasen.
 *
 * En la practica basta: de ocho URLs de editoriales reales, seis llevan el
 * identificador en la propia direccion.
 */

/** Un DOI dentro de una ruta o un parametro. */
const DOI_EN_TEXTO = /(10\.\d{4,9}\/[^\s"'<>?#&]+)/;

/** arxiv.org/abs/1706.03762 o /pdf/1706.03762v5 */
const ARXIV_URL = /arxiv\.org\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5})/i;
/** Identificadores antiguos: arxiv.org/abs/cs/0605035 */
const ARXIV_ANTIGUO = /arxiv\.org\/(?:abs|pdf)\/([a-z-]+\/\d{7})/i;
const ARXIV_SUELTO = /^arxiv:\s*([0-9]{4}\.[0-9]{4,5})$/i;

const PUBMED_URL = /pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i;
const PMID_SUELTO = /^pmid:\s*(\d+)$/i;

export type ResolvedInput =
  /** Se identifico el articulo sin ambiguedad. */
  | { kind: "doi"; doi: string }
  /** Hay un identificador, pero hay que preguntarle a una fuente cual es su DOI. */
  | { kind: "arxiv"; id: string }
  | { kind: "pmid"; id: string }
  /** No hay identificador: habra que buscar y dejar elegir al usuario. */
  | { kind: "search"; query: string }
  | { kind: "empty" };

function esUrl(valor: string): boolean {
  return /^https?:\/\//i.test(valor);
}

/**
 * Decide que hacer con lo que se escribio.
 *
 * El orden importa: primero lo que identifica el articulo con certeza (DOI),
 * luego los identificadores que requieren una consulta, y solo al final la
 * busqueda por texto, que devuelve candidatos y no una respuesta.
 */
export function resolveInput(entrada: string): ResolvedInput {
  const valor = entrada.trim();
  if (!valor) return { kind: "empty" };

  // 1. Un DOI, en cualquiera de sus formas (pelado, doi.org, "doi:").
  const doiDirecto = normalizeDoi(valor);
  if (doiDirecto) return { kind: "doi", doi: doiDirecto };

  // 2. Identificadores sueltos escritos a mano.
  const arxivSuelto = valor.match(ARXIV_SUELTO);
  if (arxivSuelto) return { kind: "arxiv", id: arxivSuelto[1] };
  const pmidSuelto = valor.match(PMID_SUELTO);
  if (pmidSuelto) return { kind: "pmid", id: pmidSuelto[1] };

  if (esUrl(valor)) {
    // 3. Un DOI incrustado en la URL. Es el caso mas comun: Springer, ACM,
    //    Wiley y PLOS lo llevan en la ruta o en la query.
    const enUrl = valor.match(DOI_EN_TEXTO);
    if (enUrl) {
      const doi = normalizeDoi(decodeURIComponent(enUrl[1]));
      if (doi) return { kind: "doi", doi };
    }

    const arxiv = valor.match(ARXIV_URL) ?? valor.match(ARXIV_ANTIGUO);
    if (arxiv) return { kind: "arxiv", id: arxiv[1] };

    const pubmed = valor.match(PUBMED_URL);
    if (pubmed) return { kind: "pmid", id: pubmed[1] };

    // 4. Una URL que no dice quien es. No se descarga: se busca por ella como
    //    texto, que a veces funciona porque el titulo va en la ruta.
    return { kind: "search", query: textoDeUrl(valor) };
  }

  // 5. Texto libre: un titulo, o una cita copiada.
  return { kind: "search", query: valor };
}

/**
 * Saca algo buscable de una URL sin identificador.
 *
 * Muchas editoriales ponen el titulo en la ruta separado por guiones. Si no
 * hay nada aprovechable, se devuelve la URL entera y que decida el buscador.
 */
export function textoDeUrl(url: string): string {
  try {
    const { pathname } = new URL(url);
    const segmentos = pathname
      .split("/")
      .filter((s) => s.length > 0)
      .map((s) => decodeURIComponent(s));

    // El segmento mas largo con varias palabras suele ser el titulo.
    const candidato = segmentos
      .filter((s) => /[a-z]{3}/i.test(s) && s.includes("-"))
      .sort((a, b) => b.length - a.length)[0];

    if (candidato) {
      return candidato.replace(/[-_]+/g, " ").replace(/\.\w+$/, "").trim();
    }
  } catch {
    // URL mal formada: se busca tal cual.
  }
  return url;
}

/**
 * Busca un DOI dentro del texto de un PDF.
 *
 * Casi todos los articulos imprimen su DOI en la primera pagina. Se mira solo
 * el principio del documento: mas adelante empiezan las referencias, y el
 * primer DOI que aparezca ahi seria el de otro articulo.
 */
export function doiEnTextoDePdf(texto: string, limite = 3000): string | null {
  const principio = texto.slice(0, limite);

  // Se recorren todas las coincidencias porque la primera puede venir cortada.
  for (const coincidencia of principio.matchAll(new RegExp(DOI_EN_TEXTO, "g"))) {
    const doi = normalizeDoi(coincidencia[1]);
    if (doi) return doi;
  }
  return null;
}
