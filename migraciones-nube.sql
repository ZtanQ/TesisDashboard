-- Las 7 migraciones de PaperLens, en orden, para pegar en el SQL Editor de Supabase.
-- Generado desde supabase/migrations/ el 2026-09-14.

-- ============================================================
-- 0001_init.sql
-- ============================================================
-- Esquema inicial de PaperLens (Plan.md §10-11).
--
-- Ocho tablas y ninguna mas hasta que exista una necesidad real. El modelo
-- refleja el tipo `Paper` de types/paper.ts: lo que una fuente no publica se
-- guarda como NULL, nunca como cero ni cadena vacia.
--
-- Para aplicarlo: pegar este archivo en el SQL Editor de Supabase y ejecutarlo.

create extension if not exists "pgcrypto";

-- --------------------------------------------------------------------------
-- papers
-- --------------------------------------------------------------------------
create table if not exists papers (
  id               uuid primary key default gen_random_uuid(),
  -- El DOI es la identidad real de un articulo; se guarda en minusculas
  -- porque la especificacion los define insensibles a mayusculas.
  doi              text not null unique,
  title            text not null,
  abstract         text,
  year             integer,
  publication_date date,
  venue            text,
  publisher        text,
  publication_type text,
  url              text,
  open_access_url  text,
  -- NULL significa "la fuente no lo dice"; 0 significa "cero citas".
  citation_count   integer,
  reference_count  integer,
  -- Procedencia del registro: de que fuentes salio y cuando.
  sources          jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists papers_created_at_idx on papers (created_at desc);
create index if not exists papers_year_idx on papers (year);

-- --------------------------------------------------------------------------
-- authors
-- --------------------------------------------------------------------------
create table if not exists authors (
  id          uuid primary key default gen_random_uuid(),
  -- Id en la fuente de origen. Puede faltar: hay autores sin identificador.
  external_id text unique,
  name        text not null,
  orcid       text
);

create index if not exists authors_name_idx on authors (lower(name));

create table if not exists paper_authors (
  paper_id        uuid not null references papers (id) on delete cascade,
  author_id       uuid not null references authors (id) on delete cascade,
  -- Posicion de firma. Puede tener huecos si una fuente omite a un autor.
  author_position integer,
  primary key (paper_id, author_id)
);

create index if not exists paper_authors_paper_idx on paper_authors (paper_id);

-- --------------------------------------------------------------------------
-- institutions
-- --------------------------------------------------------------------------
create table if not exists institutions (
  id          uuid primary key default gen_random_uuid(),
  external_id text unique,
  name        text not null,
  -- ISO 3166-1 alfa-2. NULL cuando la fuente no declara pais: no se deduce.
  country     text
);

create unique index if not exists institutions_name_key on institutions (lower(name));

create table if not exists paper_institutions (
  paper_id       uuid not null references papers (id) on delete cascade,
  institution_id uuid not null references institutions (id) on delete cascade,
  primary key (paper_id, institution_id)
);

-- --------------------------------------------------------------------------
-- topics
-- --------------------------------------------------------------------------
create table if not exists topics (
  id   uuid primary key default gen_random_uuid(),
  name text not null
);

create unique index if not exists topics_name_key on topics (lower(name));

create table if not exists paper_topics (
  paper_id uuid not null references papers (id) on delete cascade,
  topic_id uuid not null references topics (id) on delete cascade,
  primary key (paper_id, topic_id)
);

-- --------------------------------------------------------------------------
-- metrics
-- --------------------------------------------------------------------------
-- Toda metrica lleva fuente y anio: una metrica sin procedencia no es
-- interpretable (Plan.md §19). La clave incluye ambos para poder guardar la
-- misma metrica de distintas fuentes o de distintos anios sin mezclarlas.
create table if not exists metrics (
  paper_id       uuid not null references papers (id) on delete cascade,
  source         text not null,
  year           integer not null,
  quartile       text check (quartile in ('Q1', 'Q2', 'Q3', 'Q4')),
  sjr            numeric,
  citescore      numeric,
  impact_factor  numeric,
  primary key (paper_id, source, year)
);

-- --------------------------------------------------------------------------
-- updated_at automatico
-- --------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists papers_set_updated_at on papers;
create trigger papers_set_updated_at
  before update on papers
  for each row execute function set_updated_at();

-- ============================================================
-- 0002_sourced_counts.sql
-- ============================================================
-- Recuentos por fuente (Fase 5).
--
-- Semantic Scholar y OpenAlex dan cifras de citas distintas para el mismo
-- articulo porque indexan corpus distintos. Se guardan todas con su
-- procedencia en lugar de elegir una: `citation_count` sigue siendo la cifra
-- principal, y estas columnas conservan el desglose.

alter table papers
  add column if not exists citation_counts  jsonb not null default '[]'::jsonb,
  add column if not exists reference_counts jsonb not null default '[]'::jsonb;

-- ============================================================
-- 0003_ai_analyses.sql
-- ============================================================
-- Analisis generados por IA (Fase 7).
--
-- Tabla aparte y no columnas en `papers` a proposito: lo generado por IA no
-- debe poder confundirse con lo obtenido de las fuentes (Plan.md §7). Ademas
-- caduca de otra forma, lo genera un modelo concreto y cuesta dinero
-- producirlo, asi que se guarda para no repetirlo.

create table if not exists ai_analyses (
  paper_id      uuid not null references papers (id) on delete cascade,
  -- El tema de investigacion forma parte de la identidad del analisis: la
  -- relevancia solo se entiende respecto a el. Cadena vacia = sin tema.
  research_topic text not null default '',
  model         text not null,
  -- Sobre que se genero: metadata, metadata+abstract o fulltext.
  based_on      text not null,
  payload       jsonb not null,
  generated_at  timestamptz not null default now(),
  primary key (paper_id, research_topic)
);

create index if not exists ai_analyses_paper_idx on ai_analyses (paper_id);

-- ============================================================
-- 0004_fulltexts.sql
-- ============================================================
-- Texto completo extraido de un PDF (Fase 8).
--
-- Se guarda el TEXTO, no el binario: es lo que se usa despues, y el PDF ya lo
-- tiene quien lo subio. Evita ademas montar almacenamiento de archivos.
--
-- Un articulo tiene como mucho un texto completo: volver a subir un PDF
-- reemplaza el anterior.

create table if not exists paper_fulltexts (
  paper_id   uuid primary key references papers (id) on delete cascade,
  -- Nombre del archivo subido, solo para poder decir de donde salio.
  filename   text not null,
  pages      integer not null,
  characters integer not null,
  text       text not null,
  -- Secciones detectadas: tipo, encabezado y extension de cada una.
  sections   jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 0005_journal_metrics.sql
-- ============================================================
-- Metricas de revista (Fase 6).
--
-- La tabla `metrics` ya tenia clave (paper_id, source, year), asi que admitia
-- varias fuentes por articulo desde el principio. Aqui solo se anaden las
-- columnas que faltaban y el ISSN, que es la clave de busqueda.

alter table papers
  add column if not exists venue_issn text;

create index if not exists papers_venue_issn_idx on papers (venue_issn);

alter table metrics
  add column if not exists quartile_category       text,
  add column if not exists h_index                 integer,
  add column if not exists two_year_mean_citedness numeric;

-- --------------------------------------------------------------------------
-- Ranking de revistas de SCImago
-- --------------------------------------------------------------------------
-- Se importa desde el CSV que publica SCImago, que hay que descargar a mano
-- (su web bloquea la descarga automatica). Se guarda por ISSN y anio: el
-- cuartil de una revista cambia de un anio a otro y no deben mezclarse.
create table if not exists scimago_journals (
  -- ISSN sin guion, tal como lo publica SCImago.
  issn             text not null,
  year             integer not null,
  title            text not null,
  sjr              numeric,
  quartile         text check (quartile in ('Q1', 'Q2', 'Q3', 'Q4')),
  -- Categoria en la que alcanza ese cuartil. SCImago publica el mejor de
  -- todas sus categorias, y decir cual es evita dar una idea equivocada.
  quartile_category text,
  h_index          integer,
  country          text,
  publisher        text,
  imported_at      timestamptz not null default now(),
  primary key (issn, year)
);

-- ============================================================
-- 0006_quartiles_by_category.sql
-- ============================================================
-- Cuartil por categoria (Fase 6, correccion).
--
-- SCImago publica un cuartil por cada categoria tematica de la revista y solo
-- resume el mejor. Guardar unicamente ese mejor engana: Neural Computation es
-- Q1 en "Arts and Humanities (miscellaneous)" y Q2 en "Cognitive
-- Neuroscience", que es su area real. Se conservan todos.

alter table scimago_journals
  add column if not exists quartiles jsonb not null default '[]'::jsonb;

alter table metrics
  add column if not exists quartiles_by_category jsonb not null default '[]'::jsonb;

-- ============================================================
-- 0007_verifiable_fields.sql
-- ============================================================
-- Datos publicados que las fuentes ya daban y no se guardaban (Fase 6+).
--
-- Todo esto viene de OpenAlex y Crossref y estaba disponible desde el
-- principio. Lo mas importante es `is_retracted`: citar un articulo retractado
-- en una tesis es un error grave, y hasta ahora no se veia por ninguna parte.
-- NULL significa "ninguna fuente se pronuncio", que no es lo mismo que false.

alter table papers
  add column if not exists keywords           text[] not null default '{}',
  add column if not exists is_retracted       boolean,
  add column if not exists language           text,
  add column if not exists biblio             jsonb,
  add column if not exists open_access_status text,
  add column if not exists citations_by_year  jsonb not null default '[]'::jsonb,
  add column if not exists external_ids       jsonb;

