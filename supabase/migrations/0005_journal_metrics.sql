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
