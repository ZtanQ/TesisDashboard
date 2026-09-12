"use client";

import { useActionState } from "react";
import type { PaperAnalysis, RelevanceLevel } from "@/types/analysis";
import { runAnalysis, type AnalysisActionState } from "@/app/actions/analysis";

/**
 * Analisis generado por IA.
 *
 * Todo lo que se muestra aqui va dentro de un bloque marcado, con borde y
 * etiqueta propios, porque no es un dato obtenido de ninguna fuente sino una
 * interpretacion (Plan.md §7). Fuera de este bloque no aparece nada generado.
 */

const NIVEL_TEXTO: Record<RelevanceLevel, string> = {
  alta: "ALTA",
  media: "MEDIA",
  baja: "BAJA",
};

/** Un campo que la IA devolvio como null: el texto no lo decia. */
function NoConsta() {
  return (
    <span className="text-sm italic text-zinc-400 dark:text-zinc-500">
      No especificada en la información analizada.
    </span>
  );
}

function Campo({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="border-b border-zinc-100 py-3 last:border-0 dark:border-zinc-900">
      <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
        {value ?? <NoConsta />}
      </dd>
    </div>
  );
}

function Lista({
  label,
  items,
  vacio,
}: {
  label: string;
  items: string[];
  vacio: string;
}) {
  return (
    <div className="border-b border-zinc-100 py-3 last:border-0 dark:border-zinc-900">
      <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
        {items.length === 0 ? (
          <span className="text-sm italic text-zinc-400 dark:text-zinc-500">
            {vacio}
          </span>
        ) : (
          <ul className="list-disc space-y-1 pl-5">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </dd>
    </div>
  );
}

function Resultado({ analysis }: { analysis: PaperAnalysis }) {
  const fecha = new Date(analysis.generatedAt).toLocaleString("es");

  return (
    <div className="rounded-lg border border-dashed border-zinc-400 p-4 dark:border-zinc-600">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        Interpretación generada por IA
      </p>
      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
        {analysis.model} · {fecha} ·{" "}
        {analysis.basedOn === "metadata+abstract"
          ? "a partir del título, el abstract y los metadatos"
          : analysis.basedOn === "fulltext"
            ? "a partir del texto completo"
            : "a partir de los metadatos"}
      </p>

      <p className="mt-4 max-w-prose text-pretty text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
        {analysis.summary}
      </p>

      <dl className="mt-4">
        <Campo label="Objetivo" value={analysis.objective} />
        <Campo label="Problema" value={analysis.problem} />
        <Campo label="Metodología" value={analysis.methodology} />
        <Campo label="Muestra" value={analysis.sample} />
        <Campo label="Datos" value={analysis.dataset} />
        <Lista
          label="Resultados que declara"
          items={analysis.mainFindings}
          vacio="El texto analizado no enuncia resultados concretos."
        />
        <Lista
          label="Limitaciones que declara"
          items={analysis.limitations}
          vacio="El artículo no declara limitaciones en el texto analizado."
        />
      </dl>

      {analysis.relevance ? (
        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Relevancia para «{analysis.relevance.researchTopic}»
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {NIVEL_TEXTO[analysis.relevance.level]}
          </p>
          <p className="mt-1 max-w-prose text-sm text-zinc-700 dark:text-zinc-300">
            {analysis.relevance.justification}
          </p>
        </div>
      ) : null}
    </div>
  );
}

const INITIAL: AnalysisActionState = { status: "idle" };

export function AiAnalysis({
  doi,
  saved,
  canRun,
}: {
  doi: string;
  /** Análisis ya guardado, si lo hay: evita volver a pagar la misma consulta. */
  saved: PaperAnalysis | null;
  /**
   * Si se puede lanzar un análisis nuevo (hay clave de API). Un análisis ya
   * guardado se muestra aunque sea falso: leerlo no cuesta nada, y quitar la
   * clave no debería borrar de la vista lo que ya se pagó.
   */
  canRun: boolean;
}) {
  const [state, formAction, pending] = useActionState(runAnalysis, INITIAL);
  const analysis = state.analysis ?? saved;

  return (
    <div className="space-y-4">
      {analysis ? <Resultado analysis={analysis} /> : null}

      {!canRun ? (
        <p className="max-w-prose text-sm text-zinc-500 dark:text-zinc-400">
          {analysis
            ? "Para volver a analizar hace falta configurar AI_API_KEY en .env.local."
            : "El análisis por IA necesita una clave de API. Configura AI_API_KEY en .env.local. Todo lo demás de esta página funciona sin ella."}
        </p>
      ) : null}

      <form action={formAction} hidden={!canRun} className="space-y-3">
        <input type="hidden" name="doi" value={doi} />

        <div>
          <label
            htmlFor="researchTopic"
            className="block text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
          >
            Tu tema de investigación (opcional)
          </label>
          <input
            id="researchTopic"
            name="researchTopic"
            type="text"
            defaultValue={analysis?.relevance?.researchTopic ?? ""}
            placeholder="p. ej. intervenciones digitales para TDAH en secundaria"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#2a78d6] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-[#3987e5]"
          />
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Sin un tema, no se valora la relevancia: no habría respecto a qué.
          </p>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {pending
            ? "Analizando…"
            : analysis
              ? "Volver a analizar"
              : "Analizar con IA"}
        </button>
      </form>

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="max-w-prose text-sm text-[#d03b3b] dark:text-[#e66767]"
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
