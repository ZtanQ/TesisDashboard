import type { Paper } from "@/types/paper";
import { Unavailable } from "@/components/ui/unavailable";

const TYPE_LABELS: Record<string, string> = {
  "journal-article": "Artículo de revista",
  "conference-paper": "Ponencia de congreso",
  "book-chapter": "Capítulo de libro",
  preprint: "Preprint",
  other: "Otro",
};

function Row({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-900">
      <dt className="w-40 shrink-0 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="text-sm text-zinc-900 dark:text-zinc-100">
        {value !== undefined && value !== "" ? value : <Unavailable />}
      </dd>
    </div>
  );
}

export function BibliographicInfo({ paper }: { paper: Paper }) {
  return (
    <dl>
      <Row label="Revista / congreso" value={paper.venue} />
      <Row label="Editorial" value={paper.publisher} />
      <Row
        label="Tipo"
        value={
          paper.publicationType ? TYPE_LABELS[paper.publicationType] : undefined
        }
      />
      <Row label="Fecha de publicación" value={paper.publicationDate} />
      <Row label="DOI" value={paper.doi} />
    </dl>
  );
}
