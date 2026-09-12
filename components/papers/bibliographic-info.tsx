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

const ACCESO: Record<string, string> = {
  gold: "Acceso abierto (gold: publicado en revista abierta)",
  green: "Acceso abierto (green: copia en repositorio)",
  hybrid: "Acceso abierto (hybrid: abierto en revista de suscripción)",
  bronze: "Legible en la web del editor, sin licencia abierta declarada",
  diamond: "Acceso abierto (diamond: sin cargos para autor ni lector)",
  closed: "Requiere suscripción o pago",
};

/** "9 (8), 1735–1780" */
function paginacion(paper: Paper): string | undefined {
  const b = paper.biblio;
  if (!b) return undefined;
  const partes: string[] = [];
  if (b.volume) partes.push(b.issue ? `${b.volume} (${b.issue})` : b.volume);
  if (b.firstPage) {
    partes.push(b.lastPage ? `${b.firstPage}–${b.lastPage}` : b.firstPage);
  }
  return partes.length > 0 ? partes.join(", ") : undefined;
}

export function BibliographicInfo({ paper }: { paper: Paper }) {
  const idioma = paper.language
    ? (new Intl.DisplayNames(["es"], { type: "language" }).of(paper.language) ??
      paper.language)
    : undefined;

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
      <Row label="Volumen y páginas" value={paginacion(paper)} />
      <Row label="Idioma" value={idioma} />
      <Row
        label="Disponibilidad"
        value={
          paper.openAccessStatus ? ACCESO[paper.openAccessStatus] : undefined
        }
      />
      <Row label="DOI" value={paper.doi} />
    </dl>
  );
}
