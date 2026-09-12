import Link from "next/link";

export function ErrorNotice({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="max-w-prose">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{detail}</p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {action}
        <Link
          href="/"
          className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
