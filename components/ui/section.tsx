export function Section({
  title,
  hint,
  children,
}: {
  title: string;
  /** Aclaracion breve; se usa sobre todo para precisar a que se refiere un dato. */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-zinc-200 py-8 dark:border-zinc-800">
      <div className="mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          {title}
        </h2>
        {hint ? (
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
