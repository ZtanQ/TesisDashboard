import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Paper } from "@/types/paper";
import type { PaperAnalysis } from "@/types/analysis";

/**
 * Interpretacion del articulo mediante IA.
 *
 * Regla que gobierna todo este modulo: **la IA interpreta, no completa**
 * (Plan.md §17). Si el texto analizado no dice algo, el campo vuelve `null` y
 * de decirlo se encarga la interfaz. El esquema lo hace cumplir: los campos
 * son anulables a proposito, de modo que "no consta" es una respuesta valida
 * y no hay que confiar en que el modelo lo redacte bien.
 */

const MODEL = "claude-opus-5";

/** Solo hay analisis si hay algo que interpretar mas alla del titulo. */
const MIN_ABSTRACT_CHARS = 120;

const RelevanceSchema = z.object({
  level: z.enum(["alta", "media", "baja"]),
  justification: z
    .string()
    .describe(
      "Una o dos frases que citen contenido concreto del artículo. Nada de generalidades.",
    ),
});

const AnalysisSchema = z.object({
  summary: z
    .string()
    .describe("Resumen en 3-5 frases de qué hace el artículo, en español."),
  objective: z
    .string()
    .nullable()
    .describe("Objetivo declarado. null si el texto no lo enuncia."),
  problem: z
    .string()
    .nullable()
    .describe("Problema que aborda. null si no se enuncia."),
  methodology: z
    .string()
    .nullable()
    .describe(
      "Diseño metodológico tal como se describe. null si no se describe.",
    ),
  sample: z
    .string()
    .nullable()
    .describe(
      "Muestra o participantes, con su tamaño si consta. null si el texto no lo indica: no estimar.",
    ),
  dataset: z
    .string()
    .nullable()
    .describe("Datos o corpus utilizados. null si no se mencionan."),
  mainFindings: z
    .array(z.string())
    .describe("Resultados que el propio artículo afirma. Vacío si no consta."),
  limitations: z
    .array(z.string())
    .describe(
      "Limitaciones que el artículo declara. Vacío si no declara ninguna: no inferirlas.",
    ),
  topics: z.array(z.string()).describe("Temas tratados, 3-6 etiquetas breves."),
  relevance: RelevanceSchema.nullable().describe(
    "Solo si se indicó un tema de investigación. null en caso contrario.",
  ),
});

const SYSTEM_PROMPT = `Eres un asistente que caracteriza artículos científicos para un equipo de tesis. Respondes en español.

Tu única fuente es el texto que se te entrega. Reglas, en orden de importancia:

1. No inventes. Si el texto no dice algo, devuelve null en ese campo o una lista vacía. Es una respuesta correcta y esperada, no un fallo.
2. No infieras lo que no está escrito. Si no se indica el tamaño de la muestra, el campo va a null aunque el tipo de estudio sugiera uno. Si el artículo no declara limitaciones, la lista va vacía aunque se te ocurran limitaciones plausibles.
3. Distingue lo que el artículo afirma de lo que tú concluyes. En "mainFindings" van los resultados que el propio artículo declara, no tu valoración de ellos.
4. Cuando el texto sea escaso, di menos. Un análisis breve y fiel es mejor que uno extenso y especulativo.

Cuando solo recibas el título, el abstract y los metadatos, eso limita lo que puedes afirmar con fundamento: aténte a ello. Cuando recibas el texto completo por secciones, puedes ser más preciso, pero las reglas anteriores no cambian: lo que el artículo no diga, sigue sin decirse.`;

export type AnalysisErrorCode =
  | "not-configured"
  | "insufficient-text"
  | "refused"
  | "failed";

export type AnalysisResult =
  | { ok: true; analysis: PaperAnalysis }
  | { ok: false; error: AnalysisErrorCode; detail?: string };

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

/** Texto que se le da a leer al modelo. Solo datos obtenidos de las fuentes. */
function buildPaperContext(paper: Paper): string {
  const lines = [`Título: ${paper.title}`];

  if (paper.year) lines.push(`Año: ${paper.year}`);
  if (paper.venue) lines.push(`Publicado en: ${paper.venue}`);
  if (paper.publicationType) lines.push(`Tipo: ${paper.publicationType}`);
  if (paper.authors.length > 0) {
    lines.push(`Autores: ${paper.authors.map((a) => a.name).join(", ")}`);
  }
  if (paper.institutions.length > 0) {
    lines.push(
      `Instituciones: ${paper.institutions.map((i) => i.name).join(", ")}`,
    );
  }
  if (paper.topics.length > 0) {
    lines.push(`Áreas según las fuentes: ${paper.topics.join(", ")}`);
  }
  if (paper.citationCount !== undefined) {
    lines.push(`Citas registradas: ${paper.citationCount}`);
  }

  lines.push(
    "",
    paper.abstract
      ? `Abstract:\n${paper.abstract}`
      : "Abstract: no disponible en las fuentes consultadas.",
  );

  return lines.join("\n");
}

/**
 * Analiza un articulo. `researchTopic` es opcional: sin el no se valora la
 * relevancia, porque no habria contra que valorarla.
 */
export async function analyzePaper(
  paper: Paper,
  researchTopic?: string,
  /**
   * Texto completo del articulo, si se subio el PDF. Cuando existe sustituye
   * al abstract: es la diferencia entre interpretar un resumen y leer el
   * articulo, y queda registrado en `basedOn`.
   */
  fullText?: string,
): Promise<AnalysisResult> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return { ok: false, error: "not-configured" };

  const completo = fullText?.trim();
  // Sin abstract ni texto completo, el modelo solo tendria el titulo: no da
  // para un analisis honesto, y es preferible decirlo a inventar uno.
  const abstract = paper.abstract?.trim() ?? "";
  if (!completo && abstract.length < MIN_ABSTRACT_CHARS) {
    return { ok: false, error: "insufficient-text" };
  }

  const topic = researchTopic?.trim();
  const instruction = topic
    ? `Analiza el artículo. Además, valora su relevancia para esta investigación concreta: "${topic}". Justifica la valoración citando contenido del artículo.`
    : "Analiza el artículo. No se ha indicado ningún tema de investigación, así que devuelve null en el campo relevance.";

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      thinking: { type: "adaptive" },
      messages: [
        {
          role: "user",
          content: completo
            ? `${instruction}\n\n---\n${buildPaperContext(paper)}\n\nTexto completo del artículo, por secciones:\n${completo}\n---`
            : `${instruction}\n\n---\n${buildPaperContext(paper)}\n---`,
        },
      ],
      output_config: { format: zodOutputFormat(AnalysisSchema) },
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, error: "refused" };
    }

    const parsed = response.parsed_output;
    if (!parsed) {
      return { ok: false, error: "failed", detail: "Respuesta no interpretable." };
    }

    return {
      ok: true,
      analysis: {
        summary: parsed.summary,
        objective: parsed.objective,
        problem: parsed.problem,
        methodology: parsed.methodology,
        sample: parsed.sample,
        dataset: parsed.dataset,
        mainFindings: parsed.mainFindings,
        limitations: parsed.limitations,
        topics: parsed.topics,
        // La valoracion solo se conserva junto al tema que la motivo: por
        // separado no se puede interpretar.
        relevance:
          topic && parsed.relevance
            ? {
                researchTopic: topic,
                level: parsed.relevance.level,
                justification: parsed.relevance.justification,
              }
            : null,
        generatedAt: new Date().toISOString(),
        model: MODEL,
        basedOn: completo ? "fulltext" : "metadata+abstract",
      },
    };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "not-configured", detail: "Clave rechazada." };
    }
    return {
      ok: false,
      error: "failed",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
