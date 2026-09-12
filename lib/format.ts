/**
 * Formato de numeros de la aplicacion.
 *
 * Se fuerza el separador de miles incluso con cuatro cifras. La convencion
 * española escribe "8220" sin punto, pero estas cifras se leen comparandolas
 * en columna, y mezclar "8220" con "101.683" —o peor, el rango
 * "8220–101.683"— hace tropezar. La coherencia entre cifras comparables pesa
 * mas aqui que la convencion tipografica.
 */
export function formatNumber(value: number): string {
  return value.toLocaleString("es", { useGrouping: "always" });
}
