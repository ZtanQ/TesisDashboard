/**
 * Esqueleto mientras se resuelve el articulo. Reproduce la forma del
 * dashboard (cabecera, cuatro metricas, secciones) para que el contenido no
 * desplace el diseno al llegar.
 */
export default function Loading() {
  return (
    <main
      className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-6 py-12"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Analizando el artículo…</span>

      <div className="animate-pulse space-y-8">
        <div className="space-y-3">
          <div className="h-8 w-4/5 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-3/5 rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-4 w-2/5 rounded bg-zinc-100 dark:bg-zinc-900" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-20 rounded-lg border border-zinc-200 dark:border-zinc-800"
            />
          ))}
        </div>

        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="space-y-3 border-t border-zinc-200 pt-8 dark:border-zinc-800"
          >
            <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-4 w-4/5 rounded bg-zinc-100 dark:bg-zinc-900" />
          </div>
        ))}
      </div>
    </main>
  );
}
