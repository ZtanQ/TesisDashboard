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
