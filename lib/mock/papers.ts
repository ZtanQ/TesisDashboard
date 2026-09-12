import type { Paper } from "@/types/paper";

/**
 * Datos de ejemplo para la Fase 1 (interfaz sin fuentes reales).
 *
 * NO son articulos reales: los valores estan inventados para ejercitar la
 * interfaz. Por eso todos llevan `source: "mock"`, que es lo que hace que el
 * dashboard muestre el aviso de datos de ejemplo. Este modulo desaparece
 * cuando la Fase 2 conecte Semantic Scholar.
 */

const RETRIEVED_AT = "2026-01-01T00:00:00.000Z";

/** Articulo con todos los campos disponibles. */
const COMPLETE: Paper = {
  doi: "10.1000/paperlens.demo.complete",
  title:
    "Adaptive Learning Systems for Students with ADHD: A Randomized Controlled Trial",
  abstract:
    "Los sistemas de aprendizaje adaptativo prometen ajustar el ritmo y el formato de los contenidos a cada estudiante, pero su efecto en poblaciones con trastorno por déficit de atención e hiperactividad (TDAH) ha sido poco estudiado. Este trabajo presenta un ensayo controlado aleatorizado con 214 estudiantes de secundaria distribuidos en un grupo experimental, que utilizó una plataforma adaptativa durante 16 semanas, y un grupo de control con instrucción convencional. Se midieron rendimiento académico, tiempo en tarea y persistencia. El grupo experimental mostró mejoras significativas en tiempo en tarea, con un efecto menor y no significativo sobre el rendimiento. Los resultados sugieren que la adaptación del ritmo influye más en la conducta de estudio que en los resultados inmediatos de aprendizaje.",
  year: 2025,
  publicationDate: "2025-03-14",
  venue: "Computers & Education",
  publisher: "Elsevier",
  publicationType: "journal-article",
  authors: [
    {
      externalId: "mock-a1",
      name: "Helena Vargas",
      orcid: "0000-0002-1825-0097",
      position: 1,
      institutions: [
        { name: "Universidad Politécnica de Cataluña", country: "ES" },
      ],
    },
    {
      externalId: "mock-a2",
      name: "Daniel Okonkwo",
      position: 2,
      institutions: [{ name: "University of Toronto", country: "CA" }],
    },
    {
      externalId: "mock-a3",
      name: "Mei-Ling Chen",
      orcid: "0000-0001-5109-3700",
      position: 3,
      institutions: [{ name: "National Taiwan University", country: "TW" }],
    },
    {
      externalId: "mock-a4",
      name: "Rodrigo Salas",
      position: 4,
      institutions: [
        { name: "Universidad Politécnica de Cataluña", country: "ES" },
      ],
    },
  ],
  institutions: [
    { name: "Universidad Politécnica de Cataluña", country: "ES" },
    { name: "University of Toronto", country: "CA" },
    { name: "National Taiwan University", country: "TW" },
  ],
  countries: ["ES", "CA", "TW"],
  topics: [
    "Adaptive Learning",
    "ADHD",
    "Educational Technology",
    "Randomized Controlled Trial",
  ],
  citationCount: 127,
  referenceCount: 68,
  urls: {
    paper: "https://doi.org/10.1000/paperlens.demo.complete",
    pdf: "https://example.org/paperlens-demo-complete.pdf",
  },
  metrics: {
    quartile: "Q1",
    sjr: 3.12,
    citescore: 14.8,
    impactFactor: 8.9,
    source: "SCImago",
    year: 2024,
  },
  source: [
    {
      name: "mock",
      url: "https://doi.org/10.1000/paperlens.demo.complete",
      retrievedAt: RETRIEVED_AT,
    },
  ],
};

/**
 * Articulo al que le faltan muchos campos. Existe para comprobar que la
 * interfaz dice "no disponible" en vez de inventar o de romperse.
 */
const PARTIAL: Paper = {
  doi: "10.1000/paperlens.demo.partial",
  title: "Notes on Attention Allocation in Multi-Device Classrooms",
  year: 2023,
  venue: "Journal of Learning Analytics",
  publicationType: "journal-article",
  authors: [{ name: "A. Ferreira", position: 1 }],
  institutions: [],
  countries: [],
  topics: [],
  citationCount: 3,
  urls: {
    paper: "https://doi.org/10.1000/paperlens.demo.partial",
  },
  source: [
    {
      name: "mock",
      url: "https://doi.org/10.1000/paperlens.demo.partial",
      retrievedAt: RETRIEVED_AT,
    },
  ],
};

/** Ponencia de congreso, sin cuartil: los congresos no suelen tenerlo. */
const CONFERENCE: Paper = {
  doi: "10.1000/paperlens.demo.conference",
  title:
    "Detecting Disengagement from Interaction Traces: A Comparison of Four Models",
  abstract:
    "Comparamos cuatro modelos de detección de desenganche a partir de trazas de interacción registradas en una plataforma de aprendizaje en línea. Los modelos se evalúan sobre un conjunto de 1.2 millones de eventos generados por 3.400 estudiantes.",
  year: 2024,
  publicationDate: "2024-07-02",
  venue: "International Conference on Educational Data Mining (EDM)",
  publicationType: "conference-paper",
  authors: [
    {
      name: "Priya Raman",
      position: 1,
      institutions: [{ name: "Indian Institute of Science", country: "IN" }],
    },
    {
      name: "Lukas Berger",
      position: 2,
      institutions: [{ name: "ETH Zürich", country: "CH" }],
    },
  ],
  institutions: [
    { name: "Indian Institute of Science", country: "IN" },
    { name: "ETH Zürich", country: "CH" },
  ],
  countries: ["IN", "CH"],
  topics: ["Educational Data Mining", "Student Engagement", "Machine Learning"],
  citationCount: 41,
  referenceCount: 35,
  urls: {
    paper: "https://doi.org/10.1000/paperlens.demo.conference",
  },
  source: [
    {
      name: "mock",
      url: "https://doi.org/10.1000/paperlens.demo.conference",
      retrievedAt: RETRIEVED_AT,
    },
  ],
};

export const MOCK_PAPERS: Paper[] = [COMPLETE, PARTIAL, CONFERENCE];

/** DOIs reservados para provocar cada estado de error desde la interfaz. */
export const MOCK_ERROR_DOIS = {
  sourceUnavailable: "10.1000/paperlens.demo.unavailable",
} as const;

/** Los que se ofrecen como ejemplo en la portada. */
export const MOCK_EXAMPLES = [
  { doi: COMPLETE.doi!, label: "Artículo completo" },
  { doi: PARTIAL.doi!, label: "Datos incompletos" },
  { doi: CONFERENCE.doi!, label: "Ponencia de congreso" },
  { doi: MOCK_ERROR_DOIS.sourceUnavailable, label: "Fuente caída" },
] as const;
