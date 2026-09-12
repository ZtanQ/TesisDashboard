# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado actual

**Fase 0 completada.** El proyecto Next.js está creado y corre; todavía no consulta ninguna API académica ni existe base de datos. La siguiente fase es la 1 (interfaz con datos mock); `app/page.tsx` sigue siendo el boilerplate de `create-next-app` y se sustituye ahí.

`Plan.md` es la fuente de verdad para alcance, modelo de datos y orden de fases. Ante cualquier duda de diseño, consultarlo antes de improvisar.

## Qué es PaperLens

Aplicación web privada (1–2 usuarios, equipo de tesis) que recibe un **DOI** y devuelve una ficha estructurada del artículo: metadatos bibliográficos, autores, instituciones, países, tópicos, citas y métricas — obtenidos de APIs académicas, no inventados.

**Primera victoria técnica (meta del MVP):** `DOI → Semantic Scholar → normalización → dashboard`, en menos de 5 segundos. Nada más cuenta como MVP.

## Stack

Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS v4. Backend mediante Route Handlers / Server Actions en el mismo repo — **no FastAPI, no microservicios, no Docker**. PostgreSQL vía Supabase solo a partir de la Fase 4. Despliegue en Vercel.

**Next 16 trae cambios que rompen respecto a versiones anteriores.** `AGENTS.md` (generado y mantenido por `next dev`) obliga a leer la guía correspondiente en `node_modules/next/dist/docs/` antes de escribir código de Next — hazlo, no asumas las convenciones de Next 13/14. Dos consecuencias que ya afectan a este proyecto:

- Los Route Handlers **no se cachean por defecto**; el `GET` solo se cachea con `export const dynamic = 'force-static'`. Las consultas a APIs académicas deben quedarse sin cachear salvo decisión explícita.
- `params` y `searchParams` de las páginas llegan como Promesas y hay que await-earlas (relevante para `/analyze/[id]`).

## Comandos

```bash
npm run dev            # servidor de desarrollo en localhost:3000
npm run build          # build de producción
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
```

Si se añaden tests, usar Vitest y documentar aquí el comando para ejecutar un test individual.

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
