import { Unavailable } from "@/components/ui/unavailable";

export function TopicsList({ topics }: { topics: string[] }) {
  if (topics.length === 0) return <Unavailable />;

  return (
    <ul className="flex flex-wrap gap-2">
      {topics.map((topic) => (
        <li
          key={topic}
          className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          {topic}
        </li>
      ))}
    </ul>
  );
}
