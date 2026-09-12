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
