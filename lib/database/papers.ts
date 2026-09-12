import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataSource, Paper, SourcedCount } from "@/types/paper";
import type { Author, Institution } from "@/types/author";
import type { MetricSource, PaperMetrics, Quartile } from "@/types/metrics";
import { getSupabase, timedOut, withDeadline } from "@/lib/database/supabase";

/**
 * Persistencia de articulos. Un `Paper` se reparte en ocho tablas, asi que
 * guardar consiste en: crear o actualizar el articulo, resolver autores,
 * instituciones y topicos (reutilizando los que ya existen) y rehacer las
 * tablas de union.
 *
 * Las operaciones devuelven un resultado en lugar de lanzar: que la base de
 * datos no este configurada es un estado normal, no un error de programa.
 */

export type DbErrorCode = "not-configured" | "failed";

export type DbResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: DbErrorCode; detail?: string };

/** Fila de la biblioteca: lo justo para la tabla del listado. */
export interface LibraryEntry {
  doi: string;
  title: string;
  year?: number;
  venue?: string;
  citationCount?: number;
  quartile?: Quartile;
  savedAt: string;
}

function fail(detail?: string): DbResult<never> {
  return { ok: false, error: "failed", detail };
}

const TIMEOUT_DETAIL = "La base de datos no respondió a tiempo.";

/** Convierte `undefined` en `null`, que es lo que entiende PostgREST. */
function nullable<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

function optional<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

// ---------------------------------------------------------------------------
// Guardar
// ---------------------------------------------------------------------------

/**
 * Resuelve una lista de nombres contra una tabla de nombre unico, creando los
 * que falten, y devuelve sus ids.
 *
 * Sirve para instituciones y topicos: ambos comparten la forma "reutiliza el
 * existente o crealo".
 */
async function upsertByName(
  supabase: SupabaseClient,
  table: "institutions" | "topics",
  rows: { name: string; country?: string }[],
): Promise<string[]> {
  const ids: string[] = [];

  for (const row of rows) {
    // ilike compara sin distinguir mayusculas, igual que el indice unico.
    const existing = await supabase
      .from(table)
      .select("id")
      .ilike("name", row.name)
      .maybeSingle();

    if (existing.data?.id) {
      ids.push(existing.data.id as string);
      continue;
    }

    const payload: Record<string, unknown> = { name: row.name };
    if (table === "institutions") payload.country = nullable(row.country);

    const inserted = await supabase
      .from(table)
      .insert(payload)
      .select("id")
      .single();

    if (inserted.error) throw new Error(inserted.error.message);
    ids.push(inserted.data.id as string);
  }

  return ids;
}

/** Los autores se identifican por external_id cuando lo hay, y si no por nombre. */
async function upsertAuthors(
  supabase: SupabaseClient,
  authors: Author[],
): Promise<{ id: string; position?: number }[]> {
  const result: { id: string; position?: number }[] = [];

  for (const author of authors) {
    const existing = author.externalId
      ? await supabase
          .from("authors")
          .select("id")
          .eq("external_id", author.externalId)
          .maybeSingle()
      : await supabase
          .from("authors")
          .select("id")
          .ilike("name", author.name)
          .is("external_id", null)
          .maybeSingle();

    if (existing.data?.id) {
      result.push({ id: existing.data.id as string, position: author.position });
      continue;
    }

    const inserted = await supabase
      .from("authors")
      .insert({
        external_id: nullable(author.externalId),
        name: author.name,
        orcid: nullable(author.orcid),
      })
      .select("id")
      .single();

    if (inserted.error) throw new Error(inserted.error.message);
    result.push({ id: inserted.data.id as string, position: author.position });
  }

  return result;
}

/**
 * Guarda un articulo. Si el DOI ya estaba, se actualiza: analizar dos veces el
 * mismo articulo refresca sus datos en lugar de duplicarlo.
 */
export async function savePaper(
  paper: Paper,
): Promise<DbResult<{ doi: string }>> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "not-configured" };
  if (!paper.doi) return fail("El artículo no tiene DOI, que es su identidad.");

  try {
    const upserted = await withDeadline(
      supabase
        .from("papers")
        .upsert(
        {
          doi: paper.doi,
          title: paper.title,
          abstract: nullable(paper.abstract),
          year: nullable(paper.year),
          publication_date: nullable(paper.publicationDate),
          venue: nullable(paper.venue),
          publisher: nullable(paper.publisher),
          publication_type: nullable(paper.publicationType),
          url: nullable(paper.urls.paper),
          open_access_url: nullable(paper.urls.pdf),
          venue_issn: nullable(paper.venueIssn),
          citation_count: nullable(paper.citationCount),
          reference_count: nullable(paper.referenceCount),
          citation_counts: paper.citationCounts ?? [],
          reference_counts: paper.referenceCounts ?? [],
          sources: paper.source,
        },
          { onConflict: "doi" },
        )
        .select("id")
        .single(),
    );
    if (timedOut(upserted)) return fail(TIMEOUT_DETAIL);
    if (upserted.error) return fail(upserted.error.message);
    const paperId = upserted.data.id as string;

    const authorRows = await upsertAuthors(supabase, paper.authors);
    const institutionIds = await upsertByName(
      supabase,
      "institutions",
      paper.institutions,
    );
    const topicIds = await upsertByName(
      supabase,
      "topics",
      paper.topics.map((name) => ({ name })),
    );

    // Las uniones se rehacen enteras: es la unica forma de que, al reanalizar
    // un articulo, desaparezcan los vinculos que la fuente ya no reporta.
    await supabase.from("paper_authors").delete().eq("paper_id", paperId);
    await supabase.from("paper_institutions").delete().eq("paper_id", paperId);
    await supabase.from("paper_topics").delete().eq("paper_id", paperId);

    if (authorRows.length > 0) {
      const { error } = await supabase.from("paper_authors").insert(
        authorRows.map((row) => ({
          paper_id: paperId,
          author_id: row.id,
          author_position: nullable(row.position),
        })),
      );
      if (error) return fail(error.message);
    }

    if (institutionIds.length > 0) {
      const { error } = await supabase.from("paper_institutions").insert(
        institutionIds.map((id) => ({
          paper_id: paperId,
          institution_id: id,
        })),
      );
      if (error) return fail(error.message);
    }

    if (topicIds.length > 0) {
      const { error } = await supabase.from("paper_topics").insert(
        topicIds.map((id) => ({ paper_id: paperId, topic_id: id })),
      );
      if (error) return fail(error.message);
    }

    if (paper.metrics && paper.metrics.length > 0) {
      const { error } = await supabase.from("metrics").upsert(
        paper.metrics.map((metric) => ({
          paper_id: paperId,
          source: metric.source,
          year: metric.year,
          quartile: nullable(metric.quartile),
          quartile_category: nullable(metric.quartileCategory),
          sjr: nullable(metric.sjr),
          h_index: nullable(metric.hIndex),
          two_year_mean_citedness: nullable(metric.twoYearMeanCitedness),
          citescore: nullable(metric.citescore),
          impact_factor: nullable(metric.impactFactor),
        })),
        { onConflict: "paper_id,source,year" },
      );
      if (error) return fail(error.message);
    }

    return { ok: true, data: { doi: paper.doi } };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

// ---------------------------------------------------------------------------
// Leer
// ---------------------------------------------------------------------------

/** Forma en que PostgREST devuelve el articulo con sus relaciones anidadas. */
interface PaperRow {
  id: string;
  doi: string;
  title: string;
  abstract: string | null;
  year: number | null;
  publication_date: string | null;
  venue: string | null;
  publisher: string | null;
  publication_type: string | null;
  url: string | null;
  open_access_url: string | null;
  citation_count: number | null;
  reference_count: number | null;
  citation_counts: SourcedCount[] | null;
  reference_counts: SourcedCount[] | null;
  sources: DataSource[] | null;
  created_at: string;
  paper_authors?: {
    author_position: number | null;
    authors: {
      external_id: string | null;
      name: string;
      orcid: string | null;
    } | null;
  }[];
  paper_institutions?: {
    institutions: {
      external_id: string | null;
      name: string;
      country: string | null;
    } | null;
  }[];
  paper_topics?: { topics: { name: string } | null }[];
  venue_issn: string | null;
  metrics?: {
    source: string;
    year: number;
    quartile: string | null;
    quartile_category: string | null;
    sjr: number | null;
    h_index: number | null;
    two_year_mean_citedness: number | null;
    citescore: number | null;
    impact_factor: number | null;
  }[];
}

const PAPER_SELECT = [
  "id, doi, title, abstract, year, publication_date, venue, publisher",
  "publication_type, url, open_access_url, venue_issn",
  "citation_count, reference_count",
  "citation_counts, reference_counts, sources, created_at",
  "paper_authors ( author_position, authors ( external_id, name, orcid ) )",
  "paper_institutions ( institutions ( external_id, name, country ) )",
  "paper_topics ( topics ( name ) )",
  "metrics ( source, year, quartile, quartile_category, sjr, h_index, two_year_mean_citedness, citescore, impact_factor )",
].join(", ");

/** Reconstruye el `Paper` del dominio a partir de las filas. */
function rowToPaper(row: PaperRow): Paper {
  const authors: Author[] = (row.paper_authors ?? [])
    .filter((link) => link.authors !== null)
    .map((link) => ({
      externalId: optional(link.authors!.external_id),
      name: link.authors!.name,
      orcid: optional(link.authors!.orcid),
      position: optional(link.author_position),
    }))
    .sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));

  const institutions: Institution[] = (row.paper_institutions ?? [])
    .filter((link) => link.institutions !== null)
    .map((link) => ({
      externalId: optional(link.institutions!.external_id),
      name: link.institutions!.name,
      country: optional(link.institutions!.country),
    }));

  const metrics: PaperMetrics[] | undefined =
    row.metrics && row.metrics.length > 0
      ? row.metrics.map((metricRow) => ({
          source: metricRow.source as MetricSource,
          year: metricRow.year,
          quartile: optional(metricRow.quartile) as Quartile | undefined,
          quartileCategory: optional(metricRow.quartile_category),
          sjr: optional(metricRow.sjr),
          hIndex: optional(metricRow.h_index),
          twoYearMeanCitedness: optional(metricRow.two_year_mean_citedness),
          citescore: optional(metricRow.citescore),
          impactFactor: optional(metricRow.impact_factor),
        }))
      : undefined;

  return {
    id: row.id,
    doi: row.doi,
    title: row.title,
    abstract: optional(row.abstract),
    year: optional(row.year),
    publicationDate: optional(row.publication_date),
    venue: optional(row.venue),
    venueIssn: optional(row.venue_issn),
    publisher: optional(row.publisher),
    publicationType: optional(row.publication_type) as Paper["publicationType"],
    authors,
    institutions,
    countries: [
      ...new Set(
        institutions
          .map((institution) => institution.country)
          .filter((country): country is string => Boolean(country)),
      ),
    ],
    topics: (row.paper_topics ?? [])
      .filter((link) => link.topics !== null)
      .map((link) => link.topics!.name),
    citationCount: optional(row.citation_count),
    referenceCount: optional(row.reference_count),
    citationCounts: row.citation_counts?.length ? row.citation_counts : undefined,
    referenceCounts: row.reference_counts?.length
      ? row.reference_counts
      : undefined,
    urls: {
      paper: optional(row.url),
      pdf: optional(row.open_access_url),
    },
    metrics,
    source: row.sources ?? [],
  };
}

/** Recupera un articulo guardado. `data: null` significa que no esta. */
export async function getSavedPaper(
  doi: string,
): Promise<DbResult<Paper | null>> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "not-configured" };

  const response = await withDeadline(
    supabase.from("papers").select(PAPER_SELECT).eq("doi", doi).maybeSingle(),
  );
  if (timedOut(response)) return fail(TIMEOUT_DETAIL);

  const { data, error } = response;
  if (error) return fail(error.message);
  if (!data) return { ok: true, data: null };

  return { ok: true, data: rowToPaper(data as unknown as PaperRow) };
}

/** Listado de la biblioteca, del mas reciente al mas antiguo. */
export async function listLibrary(): Promise<DbResult<LibraryEntry[]>> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "not-configured" };

  const response = await withDeadline(
    supabase
      .from("papers")
      .select(
        "doi, title, year, venue, citation_count, created_at, metrics ( quartile )",
      )
      .order("created_at", { ascending: false })
      .limit(200),
  );
  if (timedOut(response)) return fail(TIMEOUT_DETAIL);

  const { data, error } = response;
  if (error) return fail(error.message);

  const rows = (data ?? []) as unknown as {
    doi: string;
    title: string;
    year: number | null;
    venue: string | null;
    citation_count: number | null;
    created_at: string;
    metrics?: { quartile: string | null }[];
  }[];

  return {
    ok: true,
    data: rows.map((row) => ({
      doi: row.doi,
      title: row.title,
      year: optional(row.year),
      venue: optional(row.venue),
      citationCount: optional(row.citation_count),
      quartile: (row.metrics?.[0]?.quartile ?? undefined) as
        | Quartile
        | undefined,
      savedAt: row.created_at,
    })),
  };
}

/**
 * Recupera varios articulos de una vez, para comparar.
 *
 * Una sola consulta en lugar de una por DOI: comparar cinco articulos no
 * deberia costar cinco viajes a la base.
 */
export async function getSavedPapers(dois: string[]): Promise<DbResult<Paper[]>> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "not-configured" };
  if (dois.length === 0) return { ok: true, data: [] };

  const response = await withDeadline(
    supabase.from("papers").select(PAPER_SELECT).in("doi", dois),
  );
  if (timedOut(response)) return fail(TIMEOUT_DETAIL);
  if (response.error) return fail(response.error.message);

  const filas = (response.data ?? []) as unknown as PaperRow[];
  const porDoi = new Map(filas.map((fila) => [fila.doi, rowToPaper(fila)]));

  // Se devuelven en el orden pedido, no en el que responda la base: la tabla
  // de comparacion debe respetar el orden en que se seleccionaron.
  return {
    ok: true,
    data: dois
      .map((doi) => porDoi.get(doi))
      .filter((paper): paper is Paper => paper !== undefined),
  };
}

/**
 * Todos los articulos de la biblioteca, con sus relaciones, para estadisticas.
 *
 * Se agrega en memoria y no en SQL porque a esta escala (una biblioteca
 * personal) la diferencia no se nota y la logica queda en un modulo puro que
 * se puede probar. El tope evita que una biblioteca inesperadamente grande
 * tumbe la pagina; si se alcanza, la interfaz lo dice.
 */
export const STATS_LIMIT = 500;

export async function getAllSavedPapers(): Promise<DbResult<Paper[]>> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "not-configured" };

  const response = await withDeadline(
    supabase
      .from("papers")
      .select(PAPER_SELECT)
      .order("created_at", { ascending: false })
      .limit(STATS_LIMIT),
  );
  if (timedOut(response)) return fail(TIMEOUT_DETAIL);
  if (response.error) return fail(response.error.message);

  const filas = (response.data ?? []) as unknown as PaperRow[];
  return { ok: true, data: filas.map(rowToPaper) };
}

/** Quita un articulo de la biblioteca. Las uniones caen en cascada. */
export async function deleteSavedPaper(doi: string): Promise<DbResult<null>> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "not-configured" };

  const response = await withDeadline(
    supabase.from("papers").delete().eq("doi", doi),
  );
  if (timedOut(response)) return fail(TIMEOUT_DETAIL);
  if (response.error) return fail(response.error.message);
  return { ok: true, data: null };
}
