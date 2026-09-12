import type { Author } from "@/types/author";
import { countryName } from "@/lib/countries";
import { Unavailable } from "@/components/ui/unavailable";

export function AuthorsTable({ authors }: { authors: Author[] }) {
  if (authors.length === 0) return <Unavailable />;

  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="py-2 pr-4 font-medium">Autor</th>
            <th className="py-2 pr-4 font-medium">Institución</th>
            <th className="py-2 font-medium">País</th>
          </tr>
        </thead>
        <tbody>
          {authors.map((author, index) => {
            const affiliation = author.institutions?.[0];
            return (
              <tr
                key={author.externalId ?? `${author.name}-${index}`}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
              >
                <td className="py-2 pr-4 text-zinc-900 dark:text-zinc-100">
                  {author.name}
                  {author.orcid ? (
                    <a
                      href={`https://orcid.org/${author.orcid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 font-mono text-[11px] text-zinc-400 underline-offset-2 hover:underline dark:text-zinc-500"
                    >
                      ORCID
                    </a>
                  ) : null}
                </td>
                <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-300">
                  {affiliation?.name ?? <Unavailable>—</Unavailable>}
                </td>
                <td className="py-2 text-zinc-600 dark:text-zinc-300">
                  {affiliation?.country ? (
                    countryName(affiliation.country)
                  ) : (
                    <Unavailable>—</Unavailable>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
