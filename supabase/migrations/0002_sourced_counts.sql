-- Recuentos por fuente (Fase 5).
--
-- Semantic Scholar y OpenAlex dan cifras de citas distintas para el mismo
-- articulo porque indexan corpus distintos. Se guardan todas con su
-- procedencia en lugar de elegir una: `citation_count` sigue siendo la cifra
-- principal, y estas columnas conservan el desglose.

alter table papers
  add column if not exists citation_counts  jsonb not null default '[]'::jsonb,
  add column if not exists reference_counts jsonb not null default '[]'::jsonb;
