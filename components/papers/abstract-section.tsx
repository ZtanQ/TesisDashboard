import { Unavailable } from "@/components/ui/unavailable";

export function Abstract({ abstract }: { abstract?: string }) {
  if (!abstract) return <Unavailable>La fuente no publica el abstract.</Unavailable>;

  return (
    <p className="max-w-prose text-pretty text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
      {abstract}
    </p>
  );
}
