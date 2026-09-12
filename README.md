# PaperLens

Sistema para análisis y caracterización de literatura científica.

Introduces un DOI y obtienes una ficha estructurada del artículo: metadatos
bibliográficos, autores, instituciones, países, tópicos, citas y métricas de
impacto — obtenidos de APIs académicas públicas.

Aplicación web privada para el equipo de tesis (1–2 usuarios).

> **Estado: fases 0–5 y 7–9 completadas.** Introduces un DOI, se consultan
> Semantic Scholar y OpenAlex en paralelo y se fusionan sus datos, puedes
> guardar el resultado en tu biblioteca, subir el PDF, interpretarlo con IA y
> comparar varios artículos entre sí.
> Analizar funciona sin base de datos y sin clave de IA: ambas son opcionales.
> Las instituciones, los países y el cuartil aparecen como no disponibles
> porque Semantic Scholar no los publica; los aportará OpenAlex.
> El roadmap completo está en [`Plan.md`](./Plan.md).

## Features

Del MVP (fases 1–3):

- Entrada por DOI.
- Consulta a Semantic Scholar.
- Normalización a un modelo de datos interno.
- Dashboard individual: título, autores, instituciones, países, año, revista,
  citas, referencias, tópicos, abstract y enlaces a las fuentes.
- Manejo explícito de errores y de datos ausentes.

Posteriores: biblioteca personal, OpenAlex y Crossref, métricas y cuartiles,
análisis mediante IA, procesamiento de PDF, comparación de artículos y
estadísticas del corpus.

## Architecture

Monolito modular sobre Next.js. El frontend nunca consume una API externa
directamente:

```
UI / Route Handler
        ↓
   Paper Service
        ↓
 Academic Provider ──→ Semantic Scholar · OpenAlex · Crossref
        ↓
 Normalizador por fuente
        ↓
   Paper (modelo interno)
        ↓
     Dashboard
```

Añadir una fuente nueva consiste en escribir un cliente en `lib/academic/` y su
normalizador en `lib/normalization/`, sin tocar los componentes.

El sistema distingue siempre entre **datos obtenidos** de una fuente y
**información generada** por IA, y lo indica en la interfaz.

## Tech Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- PostgreSQL vía Supabase (desde la Fase 4)
- Despliegue en Vercel

## Data Sources

| Fuente           | Fase | Uso                                            |
| ---------------- | ---- | ---------------------------------------------- |
| Semantic Scholar | 2    | Venue, título completo, citas; complementa a OpenAlex |
| OpenAlex         | 5    | Instituciones, países, tópicos, abstract, editorial |
| Crossref         | 5+   | Metadatos de DOI                                |
| Scopus · IEEE · WoS | futura | Solo si se dispone de acceso adecuado        |

Ninguna fuente distinta de Semantic Scholar es requisito para que el sistema
funcione.

## Installation

Requiere Node.js 20.9 o superior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

La aplicación funciona ya: analizar un DOI no necesita ninguna configuración.
Para usar la biblioteca hace falta una base de datos, con dos opciones:

```bash
npx supabase start   # pila local en Docker: aplica la migración e imprime las claves
```

o crear un proyecto en supabase.com, ejecutar `supabase/migrations/0001_init.sql`
en su SQL Editor y copiar la URL y la service role key a `.env.local`.

La aplicación queda en http://localhost:3000.

## Environment Variables

Ver [`.env.example`](./.env.example). **El MVP arranca sin ninguna clave:**
Semantic Scholar y OpenAlex permiten acceso anónimo con límites de tasa
menores, y Crossref solo pide un email de contacto.

Las claves privadas se usan exclusivamente en el servidor y nunca llegan al
navegador.

## Development

```bash
npm run dev        # servidor de desarrollo
npm run build      # build de producción
npm run start      # servir el build
npm run lint       # ESLint (incluye las reglas de arquitectura)
npm run typecheck  # chequeo de tipos
npm test           # tests; los de base de datos se saltan si no responde
```

Ramas: `main` ← `dev` ← `feature/<nombre>`. Commits con prefijo convencional
(`feat:`, `fix:`, `refactor:`).

Las convenciones de arquitectura y las reglas del dominio están en
[`CLAUDE.md`](./CLAUDE.md).

## Deployment

Vercel, conectado a la rama `main`. Las variables de entorno se configuran en el
panel del proyecto. Supabase se añade en la Fase 4.

## Limitations

PaperLens no sustituye una evaluación académica experta. Las métricas
bibliométricas y los análisis generados por IA deben interpretarse como
herramientas de apoyo.

Además:

- El cuartil corresponde a la **revista**, no al artículo. Ninguna de las dos
  fuentes actuales lo publica, así que hoy aparece siempre como no disponible.
- **Las cifras de citas no coinciden entre fuentes** porque indexan corpus
  distintos. PaperLens muestra ambas con su procedencia en lugar de elegir una.
- **El análisis por IA es una interpretación, no un dato.** Se muestra en un
  bloque aparte y marcado. Cuando el texto analizado no dice algo, lo declara
  en lugar de completarlo. Se basa en el título, el abstract y los metadatos:
  o, si subes el PDF, en el texto completo del artículo.
- **La relevancia solo se valora si declaras tu tema de investigación**, porque
  sin un criterio declarado no significaría nada.
- Sin clave de API, Semantic Scholar limita las consultas y puede responder con
  un aviso de "demasiadas consultas seguidas".
- Cuando una fuente no proporciona un dato, se indica que no está disponible.
  El sistema nunca lo estima ni lo completa.
- La cobertura depende de lo que indexen las APIs académicas consultadas.
