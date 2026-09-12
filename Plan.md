# PaperLens

## Sistema personal para análisis y caracterización de literatura científica

---

# 1. Descripción del proyecto

**PaperLens** será una aplicación web privada orientada al análisis de artículos científicos.

El usuario podrá introducir una referencia académica mediante:

* DOI
* URL
* título del artículo
* posteriormente, archivo PDF

La aplicación obtendrá automáticamente los metadatos disponibles del artículo y los transformará en una vista estructurada que permita comprender rápidamente:

* quiénes son los autores;
* qué instituciones participan;
* países de procedencia;
* año de publicación;
* revista o conferencia;
* número de citas;
* referencias;
* tópicos;
* palabras clave;
* tipo de publicación;
* disponibilidad del artículo;
* métricas bibliométricas;
* cuartil de la revista, cuando exista información verificable;
* resumen;
* objetivo;
* metodología;
* resultados;
* limitaciones;
* relevancia para una investigación.

El sistema no intentará determinar arbitrariamente si un artículo es "verdadero" o "falso". En su lugar, presentará **indicadores objetivos de impacto y calidad** y separará claramente los datos obtenidos de las fuentes de los análisis generados mediante IA.

---

# 2. Objetivo principal

Crear una herramienta sencilla que permita pasar de:

> "Tengo este artículo científico y no sé exactamente qué tan relevante es"

a:

> "Tengo una ficha completa del artículo, sus autores, instituciones, impacto, tópicos, metodología y relevancia."

---

# 3. Objetivos específicos

## Objetivo 1 — Identificación

Aceptar una referencia mediante DOI, URL o título y localizar el artículo correspondiente.

## Objetivo 2 — Enriquecimiento bibliográfico

Obtener automáticamente:

* título;
* autores;
* año;
* DOI;
* revista;
* conferencia;
* abstract;
* keywords;
* instituciones;
* países;
* citas;
* referencias;
* tópicos;
* tipo de publicación.

## Objetivo 3 — Análisis bibliométrico

Mostrar:

* número de citas;
* año de publicación;
* posición temporal;
* cuartil cuando exista;
* métricas de la revista;
* fuente de cada métrica.

## Objetivo 4 — Análisis mediante IA

Generar:

* resumen;
* objetivo;
* problema;
* metodología;
* principales resultados;
* limitaciones;
* tópicos;
* relevancia para la investigación.

## Objetivo 5 — Organización

Permitir guardar artículos analizados en una biblioteca personal.

## Objetivo 6 — Análisis colectivo

Permitir seleccionar múltiples artículos y obtener:

* distribución por año;
* distribución por cuartil;
* países;
* instituciones;
* tópicos;
* autores;
* tendencias.

---

# 4. Alcance del MVP

El MVP será deliberadamente pequeño.

### El MVP SÍ tendrá

* Next.js;
* TypeScript;
* Tailwind CSS;
* entrada de DOI;
* búsqueda del artículo;
* integración con una API académica;
* normalización de datos;
* dashboard individual;
* autores;
* instituciones;
* países;
* año;
* citas;
* tópicos;
* abstract;
* enlaces a fuentes;
* manejo de errores.

### El MVP NO tendrá

* sistema complejo de usuarios;
* scraping de Scopus;
* scraping de Web of Science;
* scraping de IEEE;
* procesamiento masivo;
* sistema de recomendaciones;
* aplicación móvil;
* pagos;
* microservicios;
* Docker obligatorio;
* Kubernetes;
* procesamiento distribuido.

---

# 5. Stack tecnológico

## Frontend

**Next.js + TypeScript**

Responsabilidades:

* interfaz;
* dashboard;
* formularios;
* visualizaciones;
* llamadas a la API;
* navegación.

## Estilos

**Tailwind CSS**

## Backend

Inicialmente:

**Next.js Route Handlers / Server Actions**

No se utilizará FastAPI inicialmente.

Esto mantiene el proyecto en un único repositorio y reduce considerablemente la complejidad.

## Base de datos

**PostgreSQL mediante Supabase**

Se utilizará cuando se implemente la biblioteca de artículos.

## APIs académicas

### Primera fuente

**Semantic Scholar**

Su API permite obtener información de papers, autores, citas, referencias y otros datos bibliográficos. También acepta DOI como identificador del paper.

### Segunda fuente

**OpenAlex**

Se incorporará posteriormente para ampliar y contrastar los metadatos.

### Tercera fuente

**Crossref**

Se utilizará principalmente como fuente de metadatos DOI.

### Futuras fuentes

* Scopus;
* IEEE Xplore;
* Web of Science.

Estas se tratarán como integraciones independientes y solamente se añadirán cuando se disponga de acceso/API adecuado.

---

# 6. Arquitectura inicial

La arquitectura será monolítica:

```text
                    USUARIO
                       |
                       v
                +-------------+
                |   Next.js   |
                |  Frontend   |
                +------+------+
                       |
                       v
                +-------------+
                | API Routes  |
                +------+------+
                       |
          +------------+-------------+
          |            |             |
          v            v             v
     Semantic      OpenAlex      Crossref
     Scholar
          |            |             |
          +------------+-------------+
                       |
                       v
                Normalización
                       |
                       v
                  PostgreSQL
                       |
                       v
                  Dashboard
```

La IA será incorporada posteriormente:

```text
                   ARTÍCULO
                      |
                      v
                Datos / PDF
                      |
                      v
                 Motor IA
                      |
        +-------------+-------------+
        |             |             |
     Objetivo      Método       Hallazgos
        |             |             |
        +-------------+-------------+
                      |
                      v
                 Dashboard
```

---

# 7. Principio fundamental del sistema

PaperLens distinguirá entre:

### Datos obtenidos

Ejemplo:

```text
Año: 2025
Citas: 127
Autores: 5
Revista: X
```

y:

### Información generada

Ejemplo:

```text
El artículo presenta una metodología experimental
orientada a evaluar...
```

La interfaz deberá indicar claramente cuándo un dato proviene de una fuente externa y cuándo corresponde a un análisis generado por IA.

---

# 8. Flujo principal

```text
Usuario
   |
   v
Introduce DOI
   |
   v
Validación
   |
   v
Buscar artículo
   |
   v
Consultar fuentes
   |
   v
Normalizar datos
   |
   v
Guardar temporalmente
   |
   v
Mostrar dashboard
```

Ejemplo:

```text
10.1234/example
        |
        v
Semantic Scholar
        |
        v
PaperData
        |
        v
Dashboard
```

---

# 9. Entrada del usuario

La página inicial tendrá una única acción principal:

```text
------------------------------------------

              PaperLens

        Analiza un artículo científico

 [ DOI, URL o título del artículo... ]

             [ Analizar ]

------------------------------------------

También podrás cargar un PDF próximamente.
```

Inicialmente se priorizará DOI.

---

# 10. Modelo de datos

## Paper

```text
Paper
--------------------------------
id
doi
title
abstract
year
publication_date
venue
publisher
publication_type
url
open_access_url
citation_count
reference_count
source
created_at
updated_at
```

## Author

```text
Author
--------------------------------
id
external_id
name
orcid
```

## PaperAuthor

```text
PaperAuthor
--------------------------------
paper_id
author_id
author_position
```

## Institution

```text
Institution
--------------------------------
id
external_id
name
country
```

## PaperInstitution

```text
PaperInstitution
--------------------------------
paper_id
institution_id
```

## Topic

```text
Topic
--------------------------------
id
name
```

## PaperTopic

```text
PaperTopic
--------------------------------
paper_id
topic_id
```

## Metrics

```text
PaperMetrics
--------------------------------
paper_id
quartile
sjr
citescore
impact_factor
citation_count
source
year
```

Importante:

Los campos de métricas podrán ser `NULL`.

Nunca se inventará una métrica que una fuente no proporcione.

---

# 11. Primera versión de la base de datos

Para acelerar el desarrollo, la primera versión puede ser incluso más sencilla:

```text
papers
authors
paper_authors
institutions
paper_institutions
topics
paper_topics
metrics
```

No se crearán más tablas hasta que exista una necesidad real.

---

# 12. Estructura del proyecto

```text
paperlens/
│
├── app/
│   │
│   ├── page.tsx
│   │
│   ├── analyze/
│   │   └── page.tsx
│   │
│   ├── library/
│   │   └── page.tsx
│   │
│   ├── compare/
│   │   └── page.tsx
│   │
│   └── api/
│       │
│       ├── papers/
│       │   └── route.ts
│       │
│       └── analyze/
│           └── route.ts
│
├── components/
│   │
│   ├── papers/
│   ├── dashboard/
│   ├── charts/
│   ├── search/
│   └── ui/
│
├── lib/
│   │
│   ├── academic/
│   │   ├── semantic-scholar.ts
│   │   ├── openalex.ts
│   │   └── crossref.ts
│   │
│   ├── normalization/
│   │   └── paper-normalizer.ts
│   │
│   ├── ai/
│   │   └── paper-analysis.ts
│   │
│   └── database/
│       └── supabase.ts
│
├── types/
│   ├── paper.ts
│   ├── author.ts
│   └── metrics.ts
│
├── prisma/
│   └── schema.prisma
│
├── public/
│
└── README.md
```

---

# 13. Tipo principal

Crear un tipo central:

```typescript
export interface Paper {
  id?: string;
  doi?: string;
  title: string;
  abstract?: string;
  year?: number;
  publicationDate?: string;

  venue?: string;
  publisher?: string;

  authors: Author[];
  institutions: Institution[];
  countries: string[];
  topics: string[];

  citationCount?: number;
  referenceCount?: number;

  publicationType?: string;

  urls: {
    paper?: string;
    pdf?: string;
  };

  metrics?: PaperMetrics;

  source: DataSource[];
}
```

La idea es que todas las APIs terminen convirtiéndose a este formato.

---

# 14. Capa de normalización

Este será uno de los componentes más importantes.

Semantic Scholar puede llamar un campo de una forma.

OpenAlex puede utilizar otra.

Crossref puede utilizar otra.

PaperLens debe convertirlos todos a:

```text
External API
     |
     v
Adapter
     |
     v
Normalized Paper
```

Ejemplo:

```typescript
SemanticScholarPaper
        ↓
normalizeSemanticScholar()
        ↓
Paper
```

Esto permitirá agregar nuevas fuentes sin modificar todo el dashboard.

---

# 15. Dashboard individual

La página `/analyze/[id]` tendrá estas secciones.

## Header

```text
Título del artículo

Autores

Revista · Año · DOI
```

## Métricas

```text
┌──────────┐ ┌──────────┐ ┌──────────┐
│  2025    │ │ 127      │ │ Q1       │
│ Año      │ │ Citas    │ │ Quartile │
└──────────┘ └──────────┘ └──────────┘
```

## Información bibliográfica

* autores;
* revista;
* DOI;
* publisher;
* tipo de publicación.

## Autores

Tabla:

```text
Autor             Institución        País
------------------------------------------------
John Smith        University X       USA
Maria López       UPC                 Peru
```

## Tópicos

Visualización de:

```text
Machine Learning
Artificial Intelligence
Education
```

## Países

Mapa o gráfico de barras.

Inicialmente será mejor utilizar barras.

No necesitamos un mapa complejo.

## Citas

Mostrar:

```text
Citas totales
```

Posteriormente:

```text
Evolución de citas por año
```

si la fuente proporciona los datos necesarios.

---

# 16. Análisis mediante IA

Esta funcionalidad será la segunda gran fase.

Entrada:

```text
Título
Abstract
Keywords
Metadatos
PDF si está disponible
```

Salida estructurada:

```json
{
  "summary": "...",
  "objective": "...",
  "problem": "...",
  "methodology": "...",
  "sample": "...",
  "dataset": "...",
  "main_findings": [],
  "limitations": [],
  "topics": [],
  "research_relevance": "high"
}
```

---

# 17. Regla para la IA

La IA **no podrá inventar información faltante**.

Si el artículo no indica el tamaño de muestra:

```text
Muestra:
No especificada en la información analizada.
```

No:

```text
Muestra: 150 participantes
```

La información debe poder rastrearse hasta el artículo.

---

# 18. Relevancia

En lugar de:

```text
Confiabilidad: 93%
```

se utilizará:

```text
Relevancia para la investigación

ALTA
```

acompañada de:

```text
Justificación:
El artículo aborda directamente...
```

Y posteriormente:

```text
Indicadores bibliométricos
--------------------------
Cuartil: Q1
Citas: 127
Año: 2025

Calidad metodológica
--------------------
Diseño experimental
Muestra declarada
Limitaciones declaradas
```

Así se evita convertir una evaluación subjetiva en una falsa métrica científica.

---

# 19. Cuartiles

El sistema no calculará arbitrariamente Q1/Q2/Q3/Q4.

Guardará:

```text
quartile
source
year
```

Ejemplo:

```text
Q1
Fuente: SCImago
Año: 2025
```

Esto permitirá posteriormente incorporar distintas fuentes de clasificación.

Además, la interfaz mostrará:

> "Cuartil de la revista, no del artículo."

---

# 20. Biblioteca

Cuando el MVP funcione:

```text
/library
```

Mostrará:

```text
Mis artículos

[ Buscar ]

Artículo                          Año    Q    Citas
---------------------------------------------------
AI in Education                  2025   Q1   127
ADHD Intervention                2024   Q1    89
Machine Learning Education       2023   Q2    54
```

Acciones:

```text
Ver
Analizar
Eliminar
```

---

# 21. Comparación

Después:

```text
/compare
```

Permitir seleccionar varios papers.

Ejemplo:

```text
Paper A
Paper B
Paper C
```

Comparación:

| Característica | Paper A | Paper B | Paper C      |
| -------------- | ------- | ------- | ------------ |
| Año            | 2025    | 2024    | 2024         |
| Q              | Q1      | Q1      | Q2           |
| Citas          | 127     | 89      | 54           |
| País           | USA     | Perú    | España       |
| Método         | ML      | Survey  | Experimental |

---

# 22. Dashboard global

Posteriormente:

```text
/statistics
```

Indicadores:

```text
Total papers
Q1
Q2
Q3
Q4
Autores
Países
Instituciones
Tópicos
```

Gráficos:

### Publicaciones por año

```text
2021 ███
2022 █████
2023 ███████
2024 ███████████
2025 █████████████
```

### Cuartiles

```text
Q1 █████████████
Q2 ███████
Q3 ███
Q4 █
```

### Topics

```text
AI
Machine Learning
Education
ADHD
Computer Vision
```

---

# 23. PDF

El procesamiento de PDF será una fase independiente.

Flujo:

```text
PDF
 |
 v
Extracción de texto
 |
 v
Limpieza
 |
 v
Separación por secciones
 |
 v
IA
 |
 +---- Abstract
 +---- Introduction
 +---- Methodology
 +---- Results
 +---- Discussion
 +---- Limitations
 +---- Conclusion
```

La IA podrá entonces realizar un análisis mucho más profundo.

---

# 24. Fuentes académicas por fases

## Fase 1

Semantic Scholar.

Permite consultar papers, autores, citas y referencias mediante su Academic Graph API.

## Fase 2

OpenAlex.

## Fase 3

Crossref.

## Fase 4

Fuentes específicas:

* Scopus;
* IEEE Xplore;
* Web of Science.

Estas no deben ser requisitos para que el sistema funcione.

---

# 25. Estrategia de integración

Nunca hacer:

```text
Dashboard → directamente Scopus
```

Hacer:

```text
Dashboard
    ↓
Paper Service
    ↓
Academic Provider
    ↓
Semantic Scholar
```

Después:

```text
Academic Provider
       |
       +-- Semantic Scholar
       +-- OpenAlex
       +-- Crossref
       +-- Scopus
       +-- IEEE
       +-- Web of Science
```

Esto permitirá agregar proveedores individualmente.

---

# 26. Manejo de errores

Casos que deben contemplarse:

### DOI inválido

```text
No pudimos identificar un artículo con ese DOI.
```

### Artículo no encontrado

```text
No encontramos información suficiente.
Prueba con el título.
```

### Fuente temporalmente caída

```text
La fuente académica no está disponible.
Inténtalo nuevamente.
```

### Datos incompletos

```text
Información no disponible.
```

Nunca:

```text
N/A → inventar dato
```

---

# 27. Seguridad

Como es una aplicación personal:

### Primera etapa

Sin autenticación.

### Segunda etapa

Agregar login.

Solo usuarios autorizados:

```text
Usuario A
Usuario B
```

No habrá:

* registro público;
* recuperación compleja;
* roles;
* administración empresarial.

---

# 28. Despliegue

Arquitectura final inicial:

```text
                 Internet
                    |
                    v
                 Vercel
                    |
                    v
                Next.js
                    |
             +------+------+
             |             |
             v             v
        APIs externas   Supabase
                         |
                         v
                     PostgreSQL
```

Esto será suficiente para 1–2 usuarios.

---

# 29. Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

SEMANTIC_SCHOLAR_API_KEY=

OPENALEX_API_KEY=

CROSSREF_EMAIL=

AI_API_KEY=
```

Las claves privadas nunca deben llegar al navegador.

---

# 30. Roadmap de desarrollo

# FASE 0 — Preparación

### Objetivo

Crear el proyecto base.

### Tareas

* [ ] Crear repositorio GitHub.
* [ ] Crear proyecto Next.js.
* [ ] Configurar TypeScript.
* [ ] Configurar Tailwind.
* [ ] Crear estructura de carpetas.
* [ ] Crear README.
* [ ] Crear `.env.local`.
* [ ] Crear rama `dev`.

### Resultado

Aplicación Next.js funcionando.

---

# FASE 1 — Interfaz

### Objetivo

Crear la experiencia visual.

### Tareas

* [ ] Home.
* [ ] Input DOI.
* [ ] Botón Analizar.
* [ ] Loading state.
* [ ] Error state.
* [ ] Página de resultados.
* [ ] Componentes de métricas.
* [ ] Tabla de autores.
* [ ] Tabla de instituciones.
* [ ] Sección de tópicos.

### Resultado

Dashboard utilizando datos mock.

---

# FASE 2 — Semantic Scholar

### Objetivo

Conectar datos reales.

### Tareas

* [ ] Crear cliente API.
* [ ] Implementar búsqueda por DOI.
* [ ] Obtener título.
* [ ] Obtener autores.
* [ ] Obtener abstract.
* [ ] Obtener año.
* [ ] Obtener citas.
* [ ] Obtener referencias.
* [ ] Obtener venue.
* [ ] Obtener URL.
* [ ] Manejar errores.

La API de Semantic Scholar admite DOI como identificador y permite solicitar campos específicos del paper, incluidos autores, citas y referencias.

### Resultado

```text
DOI
 ↓
API
 ↓
Paper
 ↓
Dashboard
```

---

# FASE 3 — Normalización

### Objetivo

Crear el modelo interno de PaperLens.

### Tareas

* [ ] Crear `Paper`.
* [ ] Crear `Author`.
* [ ] Crear `Institution`.
* [ ] Crear `Topic`.
* [ ] Crear `Metrics`.
* [ ] Crear normalizador.
* [ ] Separar API externa de UI.

### Resultado

El frontend nunca dependerá directamente de Semantic Scholar.

---

# FASE 4 — Base de datos

### Objetivo

Guardar papers.

### Tareas

* [ ] Crear proyecto Supabase.
* [ ] Crear PostgreSQL.
* [ ] Crear tablas.
* [ ] Configurar conexión.
* [ ] Guardar paper.
* [ ] Recuperar paper.
* [ ] Crear biblioteca.

### Resultado

```text
Analizar
   ↓
Guardar
   ↓
Biblioteca
```

---

# FASE 5 — OpenAlex

### Objetivo

Enriquecer y contrastar información.

### Tareas

* [ ] Crear cliente OpenAlex.
* [ ] Buscar DOI.
* [ ] Obtener instituciones.
* [ ] Obtener países.
* [ ] Obtener topics.
* [ ] Comparar resultados.
* [ ] Resolver conflictos.

Ejemplo:

```text
Semantic Scholar
       +
OpenAlex
       ↓
PaperNormalizer
       ↓
PaperLens Paper
```

---

# FASE 6 — Métricas

### Objetivo

Agregar información de impacto.

### Tareas

* [ ] Número de citas.
* [ ] Referencias.
* [ ] Fuente de citas.
* [ ] Cuartil.
* [ ] SJR.
* [ ] CiteScore.
* [ ] Impact Factor cuando corresponda.
* [ ] Año de la métrica.
* [ ] Fuente de la métrica.

Nunca mezclar métricas de años distintos sin indicarlo.

---

# FASE 7 — IA

### Objetivo

Interpretar el contenido.

### Tareas

* [ ] Crear servicio de IA.
* [ ] Crear prompt estructurado.
* [ ] Definir JSON schema.
* [ ] Validar respuesta.
* [ ] Mostrar resumen.
* [ ] Mostrar objetivo.
* [ ] Mostrar metodología.
* [ ] Mostrar resultados.
* [ ] Mostrar limitaciones.
* [ ] Mostrar relevancia.

---

# FASE 8 — PDF

### Objetivo

Analizar artículos completos.

### Tareas

* [ ] Upload PDF.
* [ ] Extracción de texto.
* [ ] Limpieza.
* [ ] Detección de secciones.
* [ ] Procesamiento IA.
* [ ] Vinculación PDF ↔ paper.

---

# FASE 9 — Comparación

### Objetivo

Comparar varios papers.

### Tareas

* [ ] Selección múltiple.
* [ ] Tabla comparativa.
* [ ] Topics compartidos.
* [ ] Diferencias metodológicas.
* [ ] Comparación de métricas.

---

# FASE 10 — Dashboard global

### Objetivo

Analizar la biblioteca completa.

### Tareas

* [ ] Papers por año.
* [ ] Papers por Q.
* [ ] Países.
* [ ] Instituciones.
* [ ] Topics.
* [ ] Autores.
* [ ] Citas.

---

# 31. Orden exacto de implementación

No desarrollar las fases simultáneamente.

El orden será:

```text
1. Next.js
      ↓
2. UI
      ↓
3. Semantic Scholar
      ↓
4. Normalización
      ↓
5. Dashboard real
      ↓
6. Supabase
      ↓
7. Biblioteca
      ↓
8. OpenAlex
      ↓
9. Métricas
      ↓
10. IA
      ↓
11. PDF
      ↓
12. Comparación
      ↓
13. Estadísticas
      ↓
14. Autenticación
      ↓
15. Deploy
```

---

# 32. Primera meta real

No intentar terminar PaperLens.

La primera meta será:

> **Introducir un DOI y obtener un dashboard real en menos de 5 segundos.**

Por ejemplo:

```text
DOI
 ↓
Semantic Scholar
 ↓
Datos
 ↓
Normalización
 ↓
Dashboard
```

Si eso funciona, ya existe un MVP.

---

# 33. Criterios de éxito del MVP

El MVP se considerará terminado cuando pueda:

* [ ] aceptar un DOI;
* [ ] identificar el artículo;
* [ ] mostrar título;
* [ ] mostrar autores;
* [ ] mostrar año;
* [ ] mostrar revista;
* [ ] mostrar abstract;
* [ ] mostrar citas;
* [ ] mostrar referencias;
* [ ] mostrar instituciones;
* [ ] mostrar países;
* [ ] mostrar tópicos;
* [ ] mostrar enlaces;
* [ ] manejar errores;
* [ ] funcionar en producción.

---

# 34. Segunda meta

Después del MVP:

> Analizar 20–50 artículos y almacenarlos.

Resultado:

```text
Mi biblioteca

52 artículos

31 Q1
14 Q2
7 Q3

12 países
35 instituciones
8 tópicos
```

---

# 35. Tercera meta

Convertir PaperLens en una herramienta útil para investigación:

```text
                    PAPERLENS
                        |
       +----------------+----------------+
       |                |                |
       v                v                v
    Analizar         Biblioteca       Comparar
       |                |                |
       +----------------+----------------+
                        |
                        v
                  Estadísticas
```

---

# 36. Git

Utilizar:

```text
main
dev
feature/...
```

Ejemplos:

```text
feature/ui-dashboard
feature/semantic-scholar
feature/paper-normalizer
feature/supabase
feature/ai-analysis
feature/pdf-analysis
feature/comparison
```

Flujo:

```text
feature
   ↓
dev
   ↓
main
```

---

# 37. Commits

Usar commits claros:

```text
feat: add paper search input
feat: integrate semantic scholar API
feat: add paper normalization
feat: create paper dashboard
feat: add supabase persistence
feat: add AI paper analysis

fix: handle invalid DOI
fix: handle missing abstract
fix: normalize author names

refactor: separate academic providers
```

---

# 38. README

El README deberá explicar:

```text
# PaperLens

Sistema para análisis de literatura científica.

## Features

## Architecture

## Tech Stack

## Data Sources

## Installation

## Environment Variables

## Development

## Deployment

## Limitations
```

Especialmente:

> PaperLens no sustituye una evaluación académica experta. Las métricas bibliométricas y análisis generados por IA deben interpretarse como herramientas de apoyo.

---

# 39. Principios del proyecto

## Principio 1

**Simple antes que completo.**

## Principio 2

**Datos verificables antes que inferencias.**

## Principio 3

**Una fuente externa nunca debe controlar toda la arquitectura.**

## Principio 4

**La IA interpreta; no inventa.**

## Principio 5

**Toda métrica debe tener fuente y año.**

## Principio 6

**No implementar una funcionalidad hasta que exista una necesidad.**

---

# 40. MVP final esperado

La primera versión funcional deberá verse aproximadamente así:

```text
┌───────────────────────────────────────────────────────┐
│                       PaperLens                       │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Analyze scientific literature                       │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 10.xxxx/xxxxx                                   │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│                    [ Analyze ]                         │
│                                                       │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Artificial Intelligence in Education                 │
│                                                       │
│ 2025       127 citations       Journal X              │
│                                                       │
├───────────────────────────────────────────────────────┤
│ AUTHORS                                               │
│                                                       │
│ John Smith · Maria López · Gabriel Pérez              │
│                                                       │
├───────────────────────────────────────────────────────┤
│ INSTITUTIONS / COUNTRIES                              │
│                                                       │
│ University X · USA                                    │
│ UPC · Peru                                            │
│                                                       │
├───────────────────────────────────────────────────────┤
│ TOPICS                                                │
│                                                       │
│ AI · Machine Learning · Education                     │
│                                                       │
├───────────────────────────────────────────────────────┤
│ ABSTRACT                                              │
│                                                       │
│ ...                                                   │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

# 41. Visión posterior

Una vez que todo lo anterior funcione, PaperLens podría evolucionar hacia:

```text
                    PAPERLENS
                       |
          +------------+------------+
          |            |            |
          v            v            v
       Papers       Authors      Topics
          |            |            |
          +------------+------------+
                       |
                       v
                Research Graph
                       |
          +------------+------------+
          |            |            |
       Citations   Institutions   Countries
```

Pero esto **no forma parte del MVP**.

---

# 42. Definición final del proyecto

### Nombre

**PaperLens**

### Tipo

Aplicación web privada.

### Usuarios

1–2 personas.

### Propósito

Análisis y organización de literatura científica.

### Stack

```text
Next.js
TypeScript
Tailwind CSS
PostgreSQL
Supabase
Semantic Scholar API
OpenAlex
Crossref
LLM
Vercel
```

### Arquitectura

Monolito modular.

### Primera fuente

Semantic Scholar.

### Primera entrada

DOI.

### Primera salida

Dashboard individual.

### Segunda salida

Biblioteca.

### Tercera salida

Análisis colectivo.

### Cuarta salida

Análisis mediante IA.

### Quinta salida

PDF.

### Sexta salida

Integración con fuentes académicas premium.

---

# 43. Primera tarea para empezar

El desarrollo debe comenzar con:

```text
[ ] Crear repositorio paperlens
[ ] Crear proyecto Next.js
[ ] Configurar TypeScript
[ ] Configurar Tailwind
[ ] Crear Home
[ ] Crear input DOI
[ ] Crear botón Analyze
[ ] Crear página /analyze
[ ] Crear tipos Paper / Author / Institution
[ ] Crear cliente Semantic Scholar
[ ] Hacer primera consulta por DOI
[ ] Mostrar título y autores
```

**No crear todavía PostgreSQL, login, IA, PDF ni Scopus.**

La primera victoria técnica debe ser:

```text
Usuario
   ↓
10.xxxx/xxxxx
   ↓
Semantic Scholar API
   ↓
Paper
   ↓
Dashboard
```

A partir de ese punto, cada nueva funcionalidad se añadirá sobre una base que ya funciona.
