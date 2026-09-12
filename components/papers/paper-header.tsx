import type { Paper } from "@/types/paper";
import { Unavailable } from "@/components/ui/unavailable";

const TYPE_LABELS: Record<string, string> = {
  "journal-article": "Artículo de revista",
  "conference-paper": "Ponencia de congreso",
  "book-chapter": "Capítulo de libro",
  preprint: "Preprint",
  other: "Otro",
};

export function PaperHeader({ paper }: { paper: Paper }) {
  const meta = [
    paper.venue,
    paper.year?.toString(),
    paper.publicationType ? TYPE_LABELS[paper.publicationType] : undefined,
  ].filter(Boolean) as string[];

  return (
    <header>
      <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
        {paper.title}
      </h1>

      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
        {paper.authors.length > 0 ? (
          paper.authors.map((author) => author.name).join(" · ")
        ) : (
          <Unavailable>Autores no disponibles</Unavailable>
        )}
      </p>

      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {meta.length > 0 ? meta.join(" · ") : <Unavailable />}
      </p>

      {paper.doi ? (
        <p className="mt-1 font-mono text-xs text-zinc-400 dark:text-zinc-500">
          {paper.doi}
        </p>
      ) : null}
    </header>
  );
}
