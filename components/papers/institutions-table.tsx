import type { Institution } from "@/types/author";
import { countryName } from "@/lib/countries";
import { Unavailable } from "@/components/ui/unavailable";

export function InstitutionsTable({
  institutions,
}: {
  institutions: Institution[];
}) {
  if (institutions.length === 0) return <Unavailable />;

  return (
    <ul className="space-y-2 text-sm">
      {institutions.map((institution, index) => (
        <li
          key={institution.externalId ?? `${institution.name}-${index}`}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-zinc-100 pb-2 last:border-0 dark:border-zinc-900"
        >
          <span className="text-zinc-900 dark:text-zinc-100">
            {institution.name}
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {institution.country ? (
              countryName(institution.country)
            ) : (
              <Unavailable>—</Unavailable>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
