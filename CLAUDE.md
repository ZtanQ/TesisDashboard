# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado actual

**Fases 0–4 completadas.** Se introduce un DOI, sale un dashboard con datos reales de Semantic Scholar, y el artículo puede guardarse en una biblioteca persistente. La siguiente es la Fase 5 (OpenAlex), que llenaría instituciones, países y tópicos finos.

`Plan.md` es la fuente de verdad para alcance, modelo de datos y orden de fases. Ante cualquier duda de diseño, consultarlo antes de improvisar.

### Qué no da Semantic Scholar (verificado contra la API)

Importa porque define qué secciones del dashboard salen vacías hoy y qué debe aportar OpenAlex en la Fase 5:

- **`authors[].affiliations` llega vacío prácticamente siempre.** Sin afiliaciones no hay instituciones ni países: esas tres secciones muestran "no disponible". No se infiere el país a partir del nombre de la institución — sería inventar.
- **No publica cuartil, SJR ni factor de impacto.** `metrics` se queda sin definir; la tarjeta de cuartil dice "Ninguna fuente lo publica".
- **`openAccessPdf.url` puede ser `""`** en vez de ausente. El normalizador trata la cadena vacía como campo ausente.
- **`publicationTypes` se contradice** (devuelve `["Book","JournalArticle","Conference"]` para una misma ponencia). Se prefiere `publicationVenue.type`, que sí distingue journal de conference.
- **Los nombres con caracteres no ASCII llegan mutilados** en algunos registros ("Jrgen Schmidhuber" por "Jürgen"). Es un defecto del dato de origen, no del cliente: se muestra tal cual, sin corregirlo a mano. Cotejar con OpenAlex es el arreglo real.
- **Hay DOIs válidos que no están indexados** (p. ej. `10.1038/nature14539`): devuelven 404 y se muestran como "no encontrado".

### Límite de tasa

Sin `SEMANTIC_SCHOLAR_API_KEY` se usa el pool anónimo, que devuelve **429 con facilidad** (ocurre en uso normal, no solo bajo carga). Por eso tiene su propio código de error y su propio mensaje, en vez de mezclarse con "fuente caída". Las consultas se cachean una hora con `next: { revalidate: 3600 }` para aliviarlo.

### La biblioteca es opcional

**Analizar funciona sin base de datos.** `getSupabase()` devuelve `null` cuando faltan credenciales y cada operación responde `not-configured`; el dashboard oculta el botón de guardar y `/library` explica qué configurar. Verificado con la base apagada: analizar sigue dando 200. No romper esto — es lo que permite clonar el repo y usarlo al momento.

Para levantar la base en local: `npx supabase start` arranca la pila en Docker, aplica `supabase/migrations/0001_init.sql` solo, e imprime `API_URL` y `SERVICE_ROLE_KEY` para copiar a `.env.local`. En Supabase en la nube, la migración se pega en el SQL Editor.

### Cómo se guarda un artículo

Un `Paper` se reparte en ocho tablas (`lib/database/papers.ts`). Tres decisiones que conviene no deshacer:

- **El DOI es la identidad.** Guardar usa `upsert` sobre `doi`: reanalizar un artículo lo actualiza en lugar de duplicarlo.
- **Las tablas de unión se rehacen enteras** en cada guardado. Es la única forma de que desaparezcan los vínculos que la fuente ya no reporta.
- **Autores, instituciones y tópicos se reutilizan** entre artículos, buscando primero por `external_id` y si no por nombre sin distinguir mayúsculas.

`NULL` en la base significa "la fuente no lo dice" y `0` significa cero: hay un test que comprueba que esa distinción sobrevive al ir y volver de la base.

Los tests de `lib/database/` son de integración contra una base real y **se saltan solos si no responde**, así que `npm test` pasa sin Docker. Con `npx supabase start` levantado, se ejecutan.

### Cómo se añade una fuente

`lib/paper-service.ts` es el único punto por el que la interfaz obtiene un artículo. Añadir OpenAlex es: un cliente en `lib/academic/`, su normalizador en `lib/normalization/`, y combinar los resultados dentro de `getPaperByDoi`. La firma (`Promise<PaperResult>`, unión discriminada) no cambia, así que ninguna página ni componente se toca.

**La separación está impuesta por ESLint, no solo por convención.** `eslint.config.mjs` prohíbe que `app/` y `components/` importen de `lib/academic/` o `lib/normalization/`, y que un normalizador use `fetch`. Si un atajo rompe la arquitectura, `npm run lint` falla con el motivo.

### Reglas del normalizador

Un normalizador convierte la forma cruda de una fuente al tipo `Paper` y nada más. Tres cosas que debe respetar, las tres cubiertas por tests:

- **Un dato ausente se queda `undefined`.** Cadena vacía o en blanco cuenta como ausente (la API devuelve `""` de verdad), pero **un cero es un dato**: un artículo con 0 citas no es un artículo sin datos de citas.
- **No se deduce lo que la fuente no dice.** Aunque "Universidad de Lima" sugiera Perú, el país se queda vacío si la fuente no lo declara.
- **Sin texto de interfaz.** El normalizador no produce cadenas para mostrar; de las ausencias se encarga la UI con `<Unavailable>`.

Los tests viven junto al código (`lib/**/*.test.ts`). Ejecutar uno solo: `npx vitest run lib/doi.test.ts`, o por nombre: `npx vitest run -t "deduplica"`.

## Qué es PaperLens

Aplicación web privada (1–2 usuarios, equipo de tesis) que recibe un **DOI** y devuelve una ficha estructurada del artículo: metadatos bibliográficos, autores, instituciones, países, tópicos, citas y métricas — obtenidos de APIs académicas, no inventados.

**Primera victoria técnica (meta del MVP):** `DOI → Semantic Scholar → normalización → dashboard`, en menos de 5 segundos. Nada más cuenta como MVP.

## Stack

Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS v4. Backend mediante Route Handlers / Server Actions en el mismo repo — **no FastAPI, no microservicios, no Docker**. PostgreSQL vía Supabase solo a partir de la Fase 4. Despliegue en Vercel.

**Next 16 trae cambios que rompen respecto a versiones anteriores.** `AGENTS.md` (generado y mantenido por `next dev`) obliga a leer la guía correspondiente en `node_modules/next/dist/docs/` antes de escribir código de Next — hazlo, no asumas las convenciones de Next 13/14. Dos consecuencias que ya afectan a este proyecto:

- Los Route Handlers **no se cachean por defecto**; el `GET` solo se cachea con `export const dynamic = 'force-static'`. Las consultas a APIs académicas deben quedarse sin cachear salvo decisión explícita.
- `params` y `searchParams` de las páginas llegan como Promesas y hay que await-earlas (relevante para `/analyze/[id]`).
- Con un `loading.tsx` presente, Next envía el esqueleto en streaming y la cabecera HTTP ya salió cuando se ejecuta `notFound()`: la pantalla de "no encontrado" se muestra bien pero con estado **200, no 404**. Es una decisión consciente — se prefiere el esqueleto, porque con la API real la espera será de segundos y nadie consume el código de estado en una app privada.

## Comandos

```bash
npm run dev            # servidor de desarrollo en localhost:3000
npx supabase start     # base de datos local en Docker (para la biblioteca)
npx supabase stop      # apagarla
npm run build          # build de producción
npm run lint           # ESLint (incluye las reglas de arquitectura)
npm run typecheck      # next typegen && tsc --noEmit
npm test               # Vitest, una pasada
npm run test:watch     # Vitest en modo continuo
npx vitest run lib/doi.test.ts        # un solo archivo
npx vitest run -t "no inventa nada"   # un solo test por nombre
```

Con Prisma (solo desde Fase 4):

```bash
npx prisma migrate dev --name <nombre>
npx prisma studio
```

## Arquitectura: la regla central

El frontend **nunca** consume una API externa directamente. Todo pasa por esta cadena:

```
UI / Route Handler → Paper Service → Academic Provider → (Semantic Scholar | OpenAlex | Crossref)
                                            ↓
                                    normalizador por fuente
                                            ↓
                                    Paper (tipo interno)
```

- `lib/academic/<fuente>.ts` — un cliente por fuente, aislado. Cada uno devuelve su tipo crudo (`SemanticScholarPaper`, etc.).
- `lib/normalization/paper-normalizer.ts` — convierte cada tipo crudo al tipo `Paper` interno (`types/paper.ts`). Añadir una fuente nueva = un cliente + un normalizador, sin tocar el dashboard.
- Los componentes solo conocen `Paper`, `Author`, `Institution`, `Topic`, `PaperMetrics`.

El tipo `Paper` incluye `source: DataSource[]`: toda ficha debe poder decir de qué fuente(s) salió.

## Invariantes del dominio (no negociables)

1. **Datos obtenidos ≠ información generada por IA.** La UI debe distinguir visualmente ambos. Nunca mezclarlos en el mismo bloque sin etiqueta.
2. **Nunca inventar un dato.** Si una fuente no da un campo, va `null` y la UI muestra "Información no disponible". Prohibido rellenar con estimaciones o placeholders plausibles.
3. **Toda métrica lleva fuente y año** (`quartile`, `sjr`, `citescore`, `impact_factor` → siempre acompañados de `source` y `year`). No mezclar métricas de años distintos sin indicarlo.
4. **El cuartil no se calcula.** Se guarda tal como lo reporta la fuente (ej. SCImago) y la UI aclara: "Cuartil de la revista, no del artículo."
5. **La IA interpreta, no completa.** Si el artículo no declara el tamaño de muestra, la salida es "No especificada en la información analizada". La respuesta de la IA se valida contra un JSON schema antes de mostrarse.
6. **Relevancia, no confiabilidad.** Se muestra `ALTA/MEDIA/BAJA` con justificación textual, nunca un porcentaje de confiabilidad — eso convertiría un juicio subjetivo en una falsa métrica.
7. **Las claves privadas no llegan al navegador.** Las llamadas a APIs académicas y al LLM ocurren en el servidor.

## Orden de implementación

Las fases son secuenciales; no adelantar trabajo de fases posteriores:

`Next.js → UI con datos mock → Semantic Scholar → normalización → dashboard real → Supabase → biblioteca → OpenAlex → métricas → IA → PDF → comparación → estadísticas → autenticación → deploy`

Fuera del MVP (no implementar todavía): login, IA, PDF, Scopus/IEEE/WoS, comparación, dashboard global, mapas.

Principio operativo de `Plan.md`: **no implementar una funcionalidad hasta que exista una necesidad real.** Ante la duda entre simple y completo, elegir simple.

## Estructura objetivo

Las carpetas ya existen (con `.gitkeep`); se van llenando por fase:

```
app/         page.tsx (home + input DOI), analyze/, library/, compare/, api/papers/, api/analyze/
components/  papers/ dashboard/ charts/ search/ ui/
lib/         academic/ normalization/ ai/ database/
types/       paper.ts author.ts metrics.ts
prisma/      schema.prisma   (solo desde Fase 4)
```

Alias de importación: `@/*` apunta a la raíz del proyecto.

Tablas iniciales (Fase 4, nada más hasta que haga falta): `papers`, `authors`, `paper_authors`, `institutions`, `paper_institutions`, `topics`, `paper_topics`, `metrics`.

## Errores

Cada fallo tiene un mensaje concreto y accionable: DOI inválido ("No pudimos identificar un artículo con ese DOI"), artículo no encontrado ("Prueba con el título"), fuente caída ("Inténtalo nuevamente"), campo ausente ("Información no disponible"). Nunca degradar un error a un dato inventado.

## Variables de entorno

La plantilla versionada es `.env.example`; la copia real es `.env.local` (ignorada por git). El MVP arranca **sin ninguna clave** — Semantic Scholar y OpenAlex permiten acceso anónimo con límites de tasa menores, y Crossref solo pide un email de contacto. Rellenar cada bloque al llegar a su fase.

Las claves privadas se usan solo en el servidor: las llamadas a APIs académicas y al LLM nunca salen del navegador.

## Git

Ramas: `main` ← `dev` ← `feature/<nombre>` (ej. `feature/semantic-scholar`, `feature/paper-normalizer`).

Commits con prefijo convencional: `feat:`, `fix:`, `refactor:` (ej. `feat: integrate semantic scholar API`, `fix: handle invalid DOI`).

@AGENTS.md
