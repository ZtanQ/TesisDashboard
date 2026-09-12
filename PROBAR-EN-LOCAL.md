# Probar PaperLens en tu máquina

Guía para levantar la demo desde cero. Está pensada para que funcione algo
útil en **tres comandos**, y que todo lo demás sea opcional.

---

## Lo mínimo: tres comandos

Necesitas [Node.js](https://nodejs.org) 20.9 o superior (`node --version`).

```bash
git clone https://github.com/ZtanQ/TesisDashboard.git
cd TesisDashboard
npm install
npm run dev
```

Abre <http://localhost:3000>, pega un DOI y pulsa **Analizar**.

**No hace falta configurar nada más para esto.** Sin base de datos, sin claves
de API y sin archivo `.env`. Semantic Scholar y OpenAlex se consultan de forma
anónima.

### DOIs para probar

Copia cualquiera de estos:

| DOI | Qué enseña |
| --- | --- |
| `10.1162/neco.1997.9.8.1735` | Artículo de revista clásico, con instituciones y países |
| `10.1145/3292500.3330701` | Ponencia de congreso |
| `10.1038/nature14539` | Solo está en OpenAlex: sin esa fuente daría «no encontrado» |
| `10.1371/journal.pone.0000217` | Acceso abierto |

También sirve pegar la URL entera de doi.org, o incluso `(doi: 10.xxxx/yyyy)`
copiado de una cita.

### Qué verás

- Autores con su institución y país.
- **Dos cifras de citas**, una por fuente, cuando no coinciden. No es un error:
  Semantic Scholar y OpenAlex indexan corpus distintos y PaperLens enseña
  ambas en lugar de elegir una.
- Casillas que dicen «Información no disponible». Tampoco es un error: cuando
  una fuente no publica un dato, se dice en vez de rellenarlo.

---

## Opcional 1: base de datos

Hace falta para **guardar artículos, comparar, ver estadísticas y subir PDF**.
Analizar sigue funcionando sin ella.

Necesitas [Docker Desktop](https://www.docker.com/products/docker-desktop/)
instalado **y arrancado**.

```bash
npx supabase start
```

La primera vez descarga varias imágenes y tarda unos minutos. Al terminar
imprime un bloque con `API_URL` y `SERVICE_ROLE_KEY`. Crea el archivo
`.env.local` a partir de la plantilla y pega esos dos valores:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<el SERVICE_ROLE_KEY que imprimió el comando>
```

Reinicia `npm run dev`. Ahora el dashboard muestra **Guardar en la biblioteca**,
y se activan `/library`, `/compare` y `/statistics`.

Para apagarla: `npx supabase stop` (los datos se conservan).

---

## Opcional 2: cuartiles y SJR

Sin esto, la tarjeta de cuartil dice «Ninguna fuente lo publica», que es
literalmente cierto: ni Semantic Scholar ni OpenAlex lo publican. El único
sitio gratuito que lo da es SCImago, y su web bloquea la descarga automática,
así que el archivo se baja a mano.

Requiere tener la base de datos del paso anterior.

1. Ve a <https://www.scimagojr.com/journalrank.php>
2. Elige el año y pulsa **Download data**
3. Importa el archivo:

```bash
npm run import:scimago -- "scimagojr 2025.csv" 2025
```

Son unas 32.000 revistas y tarda cerca de un minuto. Después, los artículos de
revistas indexadas muestran cuartil, SJR e índice h.

> **Ojo al leer el cuartil.** Una revista tiene un cuartil distinto en cada
> categoría temática, y SCImago solo resume el mejor. PaperLens los muestra
> todos: *Neural Computation*, por ejemplo, es **Q1** en «Arts and Humanities
> (miscellaneous)» pero **Q2** en «Cognitive Neuroscience», que es su área real.
> Mira la categoría que corresponda a tu tema antes de citarlo.

El CSV no está en el repositorio: pesa 11 MB y su licencia (CC BY-NC)
desaconseja redistribuirlo.

---

## Opcional 3: análisis por IA

Interpreta el artículo y devuelve objetivo, metodología, muestra, resultados y
limitaciones. Cada análisis es **una llamada de pago**, por eso se lanza con un
botón y no al cargar la página.

Necesitas una clave de <https://console.anthropic.com>. Ponla en `.env.local`:

```env
AI_API_KEY=sk-ant-...
```

Sin clave, todo lo demás funciona igual; solo desaparece el botón de analizar.

Si además subes el PDF del artículo (requiere la base de datos), el análisis
lee el trabajo entero en vez de solo el abstract.

> Cuando el texto no dice algo, el análisis responde «No especificada en la
> información analizada» en lugar de inventarlo. Eso es intencionado.

---

## Problemas frecuentes

**«Demasiadas consultas seguidas»**
Semantic Scholar limita las peticiones anónimas y se alcanza el límite con
facilidad. Espera unos segundos. Si molesta, pide una clave gratuita en
<https://www.semanticscholar.org/product/api> y ponla en `.env.local` como
`SEMANTIC_SCHOLAR_API_KEY`.

**«No encontramos información suficiente»**
Ese DOI no está indexado en ninguna de las dos fuentes. Pasa con DOIs muy
nuevos o muy antiguos. Prueba otro de la tabla de arriba.

**`npx supabase start` falla**
Docker Desktop tiene que estar **arrancado**, no solo instalado. Compruébalo
con `docker info`.

**Añadiste la base de datos después y falta alguna tabla**
`npx supabase start` solo aplica las migraciones cuando **crea** la base. Sobre
una que ya existía:

```bash
npx supabase migration up --local
```

**El puerto 3000 está ocupado**

```bash
PORT=3001 npm run dev
```

---

## Comandos útiles

```bash
npm run dev          # servidor de desarrollo
npm test             # tests (los de base de datos se saltan si no responde)
npm run lint         # ESLint, incluye las reglas de arquitectura
npm run typecheck    # comprobación de tipos
npx supabase start   # base de datos local
npx supabase stop    # apagarla, conservando los datos
```

---

## Si quieres entender el código

- [`README.md`](./README.md) — qué es el proyecto y su arquitectura.
- [`CLAUDE.md`](./CLAUDE.md) — decisiones de diseño y por qué se tomaron: qué
  aporta cada fuente, cómo se fusionan, qué impide que la IA invente datos.
- [`Plan.md`](./Plan.md) — el plan original completo.
