/**
 * Importa el ranking de revistas de SCImago a la base de datos.
 *
 * SCImago es la única fuente gratuita que publica cuartil y SJR, pero su web
 * bloquea la descarga automática, así que el CSV se descarga a mano:
 *
 *   1. Ir a https://www.scimagojr.com/journalrank.php
 *   2. Elegir el año y pulsar "Download data"
 *   3. Guardar el archivo y ejecutar:
 *        npm run import:scimago -- <archivo.csv> <año>
 *
 * Se importa por (ISSN, año): el cuartil de una revista cambia de un año a
 * otro y no deben mezclarse. Volver a importar el mismo año lo reemplaza.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parseScimagoCsv } from "../lib/academic/scimago.ts";

const LOTE = 500;

function salir(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

const [archivo, anioTexto] = process.argv.slice(2);
if (!archivo || !anioTexto) {
  salir(
    "Uso: npm run import:scimago -- <archivo.csv> <año>\n" +
      "Ejemplo: npm run import:scimago -- scimagojr-2024.csv 2024",
  );
}

const anio = Number(anioTexto);
if (!Number.isInteger(anio) || anio < 1990 || anio > 2100) {
  salir(`Año no válido: ${anioTexto}`);
}

try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin .env.local se usan las variables del entorno.
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  salir(
    "Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Configúralas en .env.local (o levanta la base con `npx supabase start`).",
  );
}

let contenido;
try {
  contenido = readFileSync(archivo, "utf8");
} catch (error) {
  salir(`No se pudo leer ${archivo}: ${error.message}`);
}

const filas = parseScimagoCsv(contenido, anio);
if (filas.length === 0) {
  salir(
    "El archivo no tiene filas reconocibles.\n" +
      "¿Es el CSV de https://www.scimagojr.com/journalrank.php? Debe incluir las columnas Title, Issn y Categories.",
  );
}

const conCuartil = filas.filter((f) => f.quartile).length;
console.log(
  `Leídas ${filas.length} entradas de ${anio} (${conCuartil} con cuartil).`,
);

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let insertadas = 0;
for (let i = 0; i < filas.length; i += LOTE) {
  const lote = filas.slice(i, i + LOTE).map((f) => ({
    issn: f.issn,
    year: f.year,
    title: f.title,
    sjr: f.sjr ?? null,
    quartile: f.quartile ?? null,
    quartile_category: f.quartileCategory ?? null,
    quartiles: f.quartiles ?? [],
    h_index: f.hIndex ?? null,
    country: f.country ?? null,
    publisher: f.publisher ?? null,
  }));

  const { error } = await db
    .from("scimago_journals")
    .upsert(lote, { onConflict: "issn,year" });

  if (error) salir(`Error al importar: ${error.message}`);

  insertadas += lote.length;
  process.stdout.write(`\r  importadas ${insertadas}/${filas.length}`);
}

console.log(`\nListo. ${insertadas} entradas de ${anio} en la base de datos.`);
