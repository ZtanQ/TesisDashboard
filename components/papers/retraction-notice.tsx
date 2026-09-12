/**
 * Aviso de retractacion.
 *
 * Es el dato mas importante que puede traer una ficha: citar un articulo
 * retractado en una tesis es un error grave, asi que va arriba del todo y con
 * el unico color de alarma de la aplicacion. Solo aparece cuando una fuente lo
 * afirma; que ninguna se pronuncie no es una garantia de lo contrario, y por
 * eso no se muestra nada tranquilizador en ese caso.
 */
export function RetractionNotice({ isRetracted }: { isRetracted?: boolean }) {
  if (isRetracted !== true) return null;

  return (
    <p
      role="alert"
      className="mt-6 rounded-lg border-2 border-[#d03b3b] bg-[#d03b3b]/10 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50"
    >
      <strong className="font-semibold">Artículo retractado.</strong> Las
      fuentes consultadas lo marcan como retirado por la revista. Comprueba el
      aviso de retractación en la web del editor antes de citarlo.
    </p>
  );
}
