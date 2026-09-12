import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaperByDoi } from "@/lib/paper-service";
import { PAPER_ERROR_MESSAGES } from "@/lib/errors";
import { PaperHeader } from "@/components/papers/paper-header";
import { BibliographicInfo } from "@/components/papers/bibliographic-info";
import { AuthorsTable } from "@/components/papers/authors-table";
import { InstitutionsTable } from "@/components/papers/institutions-table";
import { TopicsList } from "@/components/papers/topics-list";
import { Abstract } from "@/components/papers/abstract-section";
import { SourceLinks } from "@/components/papers/source-links";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { JournalMetrics } from "@/components/papers/journal-metrics";
import { RetractionNotice } from "@/components/papers/retraction-notice";
import { CountriesBar } from "@/components/charts/countries-bar";
import { YearColumns } from "@/components/charts/year-columns";
import { Section } from "@/components/ui/section";
import { ErrorNotice } from "@/components/ui/error-notice";
import { SaveButton } from "@/components/papers/save-button";
import { getSavedPaper } from "@/lib/database/papers";
import { getSavedAnalysis } from "@/lib/database/analyses";
import { getFulltext } from "@/lib/database/fulltexts";
import { PdfUpload } from "@/components/papers/pdf-upload";
import { isAiConfigured } from "@/lib/ai/paper-analysis";
import { AiAnalysis } from "@/components/papers/ai-analysis";

export default async function AnalyzePage({
  params,
}: PageProps<"/analyze/[id]">) {
  // En Next 16 `params` es una promesa; el id llega codificado porque un DOI
  // contiene "/".
  const { id } = await params;
  const result = await getPaperByDoi(decodeURIComponent(id));

  if (!result.ok) {
    // Un DOI valido sin datos muestra la pantalla de not-found.
    //
    // Ojo: la respuesta sale con estado 200, no 404. Al existir `loading.tsx`,
    // Next envia el esqueleto en streaming y la cabecera ya se ha mandado
    // cuando `notFound()` se ejecuta. Se prefiere conservar el esqueleto: con
    // la API real (Fase 2) la espera sera de segundos, y esta es una
    // aplicacion privada donde el codigo de estado no lo consume nadie.
    // Si algun dia hiciera falta el 404 de verdad, hay que quitar
    // `loading.tsx` y perder el streaming.
    if (result.error === "not-found") notFound();

    const message = PAPER_ERROR_MESSAGES[result.error];
    return (
      <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-6 py-16">
        <ErrorNotice title={message.title} detail={message.detail} />
      </main>
    );
  }

  const { paper } = result;

  // Si la base de datos no esta configurada no hay biblioteca, y el boton de
  // guardar simplemente no aparece: analizar sigue funcionando sin ella.
  const saved = paper.doi ? await getSavedPaper(paper.doi) : null;
  const libraryAvailable = saved?.ok === true;
  const isSaved = saved?.ok === true && saved.data !== null;

  // Un analisis ya guardado se reutiliza: cada uno cuesta una llamada de pago.
  const previousAnalysis =
    paper.doi && isSaved ? await getSavedAnalysis(paper.doi) : null;
  const fulltext = paper.doi && isSaved ? await getFulltext(paper.doi) : null;
  const aiAvailable = isAiConfigured();

  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          ← Nuevo análisis
        </Link>
        {libraryAvailable && paper.doi ? (
          <SaveButton doi={paper.doi} isSaved={isSaved} />
        ) : null}
      </div>

      <RetractionNotice isRetracted={paper.isRetracted} />

      <div className="mt-8">
        <PaperHeader paper={paper} />
      </div>

      <div className="mt-8">
        <MetricsGrid paper={paper} />
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          El cuartil corresponde a la revista, no al artículo.
        </p>
      </div>

      {paper.citationsByYear && paper.citationsByYear.length > 0 ? (
        <Section
          title="Citas por año"
          hint="Según OpenAlex. El año en curso está incompleto."
        >
          <YearColumns
            data={paper.citationsByYear.map((entrada) => ({
              label: String(entrada.year),
              count: entrada.count,
            }))}
            emptyMessage="La fuente no desglosa las citas por año."
          />
        </Section>
      ) : null}

      <Section title="Información bibliográfica">
        <BibliographicInfo paper={paper} />
      </Section>

      <Section
        title="Métricas de la revista"
        hint="Corresponden a la revista, no a este artículo."
      >
        <JournalMetrics metrics={paper.metrics} venue={paper.venue} />
      </Section>

      <Section title="Autores">
        <AuthorsTable authors={paper.authors} />
      </Section>

      <Section title="Instituciones">
        <InstitutionsTable institutions={paper.institutions} />
      </Section>

      <Section title="Países" hint="Número de autores por país de afiliación.">
        <CountriesBar authors={paper.authors} />
      </Section>

      <Section title="Tópicos">
        <TopicsList topics={paper.topics} />
      </Section>

      <Section
        title="Palabras clave"
        hint="Tal como las declaran las fuentes; no son los tópicos."
      >
        <TopicsList topics={paper.keywords} />
      </Section>

      <Section title="Abstract">
        <Abstract abstract={paper.abstract} />
      </Section>

      {isSaved && paper.doi ? (
        <Section
          title="Texto completo"
          hint="Sube el PDF para que el análisis lea el artículo entero y no solo el abstract."
        >
          <PdfUpload
            doi={paper.doi}
            stored={fulltext?.ok ? fulltext.data : null}
          />
        </Section>
      ) : null}

      <Section
        title="Análisis por IA"
        hint="Interpretación generada, no datos obtenidos de las fuentes."
      >
        {paper.doi ? (
          <AiAnalysis
            doi={paper.doi}
            saved={previousAnalysis?.ok ? previousAnalysis.data : null}
            canRun={aiAvailable}
          />
        ) : null}
      </Section>

      <Section title="Fuentes">
        <SourceLinks paper={paper} />
      </Section>
    </main>
  );
}
