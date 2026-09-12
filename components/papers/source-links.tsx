import type { Paper } from "@/types/paper";
import { SourceBadge } from "@/components/ui/source-badge";
import { Unavailable } from "@/components/ui/unavailable";

/**
 * Enlaces al articulo y procedencia de los datos. Todo dato mostrado debe
 * poder rastrearse hasta su fuente (Plan.md §17).
 */
export function SourceLinks({ paper }: { paper: Paper }) {
  const links = [
    { href: paper.urls.paper, label: "Ver artículo en la fuente" },
    { href: paper.urls.pdf, label: "PDF en acceso abierto" },
  ].filter((link): link is { href: string; label: string } =>
    Boolean(link.href),
  );

  return (
    <div className="space-y-4">
      {links.length > 0 ? (
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#2a78d6] underline-offset-4 hover:underline dark:text-[#3987e5]"
              >
                {link.label} ↗
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <Unavailable>La fuente no proporciona enlaces.</Unavailable>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Datos obtenidos de:
        </span>
        {paper.source.map((source) => (
          <SourceBadge key={source.name} source={source.name} />
        ))}
      </div>
    </div>
  );
}
