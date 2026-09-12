import type { CategoryQuartile, Quartile } from "@/types/metrics";

/**
 * Lectura del CSV de SCImago Journal Rank.
 *
 * SCImago es la unica fuente gratuita que publica cuartil y SJR, pero su web
 * bloquea la descarga automatica, asi que el archivo se descarga a mano una
 * vez al anio desde https://www.scimagojr.com/journalrank.php (boton "Download
 * data") y se importa con `npm run import:scimago`.
 *
 * El CSV usa punto y coma como separador y coma como decimal, que es lo
 * habitual en los volcados europeos.
 */

export interface ScimagoJournal {
  /** ISSN sin guion, tal como lo publica SCImago. */
  issn: string;
  year: number;
  title: string;
  sjr?: number;
  quartile?: Quartile;
  /** Categoria en la que alcanza su mejor cuartil. */
  quartileCategory?: string;
  /** Cuartil en cada una de sus categorias. */
  quartiles: CategoryQuartile[];
  hIndex?: number;
  country?: string;
  publisher?: string;
}

/** "1,234" -> 1.234 ; vacio o "-" -> undefined. */
function numero(valor: string | undefined): number | undefined {
  const limpio = valor?.trim().replace(",", ".");
  if (!limpio || limpio === "-") return undefined;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : undefined;
}

function entero(valor: string | undefined): number | undefined {
  const n = numero(valor);
  return n === undefined ? undefined : Math.round(n);
}

function texto(valor: string | undefined): string | undefined {
  const limpio = valor?.trim();
  return limpio ? limpio : undefined;
}

/**
 * Normaliza un ISSN a ocho digitos sin guion.
 *
 * SCImago los publica sin guion y OpenAlex con el, asi que hay que igualarlos
 * para poder emparejar. La X final de algunos ISSN se conserva en mayuscula.
 */
export function normalizeIssn(valor: string): string {
  return valor.replace(/[^0-9Xx]/g, "").toUpperCase();
}

/**
 * Extrae el cuartil de **cada** categoria de la columna "Categories".
 *
 * El formato es "Education (Q1); Computer Science (Q2)". SCImago clasifica
 * cada revista en varias categorias con un cuartil por cada una, y solo
 * publica el mejor en su columna resumen. Aqui se conservan todos, ordenados
 * de mejor a peor, porque el mejor por si solo puede enganar: Neural
 * Computation es Q1 en "Arts and Humanities (miscellaneous)" y Q2 en
 * "Cognitive Neuroscience", que es su area real.
 */
export function parseQuartiles(
  categorias: string | undefined,
): CategoryQuartile[] {
  if (!categorias) return [];

  const salida: CategoryQuartile[] = [];
  for (const parte of categorias.split(";")) {
    const m = parte.trim().match(/^(.*?)\s*\(Q([1-4])\)$/);
    if (!m) continue;
    salida.push({ category: m[1].trim(), quartile: `Q${m[2]}` as Quartile });
  }

  // Q1 primero: el orden lexicografico de "Q1".."Q4" ya es el correcto.
  return salida.sort((a, b) => a.quartile.localeCompare(b.quartile));
}

/** El mejor cuartil y la categoria en que se alcanza. */
export function bestQuartile(
  categorias: string | undefined,
): CategoryQuartile | undefined {
  return parseQuartiles(categorias)[0];
}

/** Parte una linea CSV respetando las comillas dobles. */
function partirLinea(linea: string, separador: string): string[] {
  const campos: string[] = [];
  let actual = "";
  let enComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (enComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        enComillas = !enComillas;
      }
    } else if (c === separador && !enComillas) {
      campos.push(actual);
      actual = "";
    } else {
      actual += c;
    }
  }
  campos.push(actual);
  return campos;
}

/**
 * Convierte el CSV de SCImago en registros por ISSN.
 *
 * Una revista puede tener varios ISSN (papel y electronico) en la misma celda;
 * se emite un registro por cada uno para que cualquiera de ellos encuentre la
 * revista.
 */
export function parseScimagoCsv(
  contenido: string,
  year: number,
): ScimagoJournal[] {
  const lineas = contenido.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lineas.length < 2) return [];

  const separador = lineas[0].includes(";") ? ";" : ",";
  const cabecera = partirLinea(lineas[0], separador).map((c) =>
    c.trim().toLowerCase(),
  );

  const col = (nombre: string) => cabecera.indexOf(nombre);
  const iIssn = col("issn");
  const iTitulo = col("title");
  const iSjr = col("sjr");
  const iH = col("h index");
  const iPais = col("country");
  const iEditor = col("publisher");
  const iCategorias = col("categories");

  if (iIssn < 0 || iTitulo < 0) return [];

  const salida: ScimagoJournal[] = [];

  for (const linea of lineas.slice(1)) {
    const campos = partirLinea(linea, separador);
    const titulo = texto(campos[iTitulo]);
    if (!titulo) continue;

    const cuartiles = parseQuartiles(texto(campos[iCategorias]));
    const mejor = cuartiles[0];

    // Varios ISSN en una celda, separados por coma.
    for (const bruto of (campos[iIssn] ?? "").split(",")) {
      const issn = normalizeIssn(bruto);
      if (issn.length !== 8) continue;

      salida.push({
        issn,
        year,
        title: titulo,
        sjr: numero(campos[iSjr]),
        quartile: mejor?.quartile,
        quartileCategory: mejor?.category,
        quartiles: cuartiles,
        hIndex: entero(campos[iH]),
        country: texto(campos[iPais]),
        publisher: texto(campos[iEditor]),
      });
    }
  }

  return salida;
}
