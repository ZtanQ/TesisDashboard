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
