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
