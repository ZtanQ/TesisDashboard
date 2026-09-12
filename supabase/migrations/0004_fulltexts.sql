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
