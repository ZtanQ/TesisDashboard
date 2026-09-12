/**
 * Marcador para un dato que la fuente no proporciona.
 *
 * Existe como componente propio para que sea imposible rellenar un hueco con
 * un "N/A", un cero o una estimacion: cuando falta un dato, se dice
 * (Plan.md §26, invariante 2).
 */
export function Unavailable({ children }: { children?: React.ReactNode }) {
  return (
    <span className="text-sm italic text-zinc-400 dark:text-zinc-500">
      {children ?? "Información no disponible"}
    </span>
  );
}
