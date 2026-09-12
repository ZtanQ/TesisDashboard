/**
 * Un DOI valido empieza por "10." seguido del prefijo de registrante y un
 * sufijo. Se acepta deliberadamente una forma laxa: los sufijos no estan
 * normalizados y rechazar de mas dejaria fuera articulos reales.
 */
const DOI_PATTERN = /^10\.\d{4,9}\/\S+$/;

/** Prefijos de URL de los resolvedores habituales de DOI. */
const RESOLVER_PREFIXES = [
  "https://doi.org/",
  "http://doi.org/",
  "https://dx.doi.org/",
  "http://dx.doi.org/",
  "doi:",
];

/**
 * Extrae el DOI de lo que haya escrito el usuario: el DOI pelado, una URL de
 * doi.org o la forma "doi:10.x/y". Devuelve null si no hay un DOI reconocible.
 *
 * El DOI se normaliza a minusculas porque la especificacion los define como
 * insensibles a mayusculas, y asi dos entradas del mismo articulo colisionan.
 */
export function normalizeDoi(input: string): string | null {
  let value = input.trim();
  if (!value) return null;

  for (const prefix of RESOLVER_PREFIXES) {
    if (value.toLowerCase().startsWith(prefix)) {
      value = value.slice(prefix.length);
      break;
    }
  }

  // Una URL de resolvedor puede traer query string o fragmento.
  value = value.split(/[?#]/)[0].trim();
  value = value.replace(/[.,;)\]]+$/, "");

  if (!DOI_PATTERN.test(value)) return null;
  return value.toLowerCase();
}

export function isValidDoi(input: string): boolean {
  return normalizeDoi(input) !== null;
}

/** Codifica un DOI para usarlo como segmento de ruta (/analyze/[id]). */
export function encodeDoiForUrl(doi: string): string {
  return encodeURIComponent(doi);
}
