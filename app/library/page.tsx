import Link from "next/link";
import { listLibrary } from "@/lib/database/papers";
import { ErrorNotice } from "@/components/ui/error-notice";
import { LibrarySelection } from "@/components/papers/library-selection";

export const metadata = {
  title: "Biblioteca · PaperLens",
};

/**
 * La biblioteca siempre refleja el estado actual de la base de datos.
 *
 * Sin esto Next la prerenderiza en el build: serviria una copia congelada, no
 * mostraria lo que guarde la otra persona del equipo y, si la base no esta
 * configurada durante el build, dejaria grabado el mensaje de error.
 */
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const result = await listLibrary();

  if (!result.ok && result.error === "not-configured") {
    return (
      <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-6 py-16">
        <ErrorNotice
          title="La biblioteca necesita una base de datos."
          detail="Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local y aplica supabase/migrations/0001_init.sql. Analizar artículos funciona sin esto."
        />
      </main>
    );
  }

  if (!result.ok) {
    return (
      <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-6 py-16">
        <ErrorNotice
          title="No pudimos leer la biblioteca."
          detail={result.detail ?? "La base de datos no respondió."}
        />
      </main>
    );
  }

  const entries = result.data;

  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
      >
        ← Nuevo análisis
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Mis artículos
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {entries.length === 0
          ? "Todavía no has guardado ninguno."
          : `${entries.length} ${entries.length === 1 ? "artículo" : "artículos"}`}
      </p>

      {entries.length === 0 ? (
        <p className="mt-8 max-w-prose text-sm text-zinc-600 dark:text-zinc-300">
          Analiza un artículo por su DOI y pulsa «Guardar en la biblioteca» para
          que aparezca aquí.
        </p>
      ) : (
        <LibrarySelection entries={entries} />
      )}
    </main>
  );
}
