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
import { CountriesBar } from "@/components/charts/countries-bar";
import { Section } from "@/components/ui/section";
import { ErrorNotice } from "@/components/ui/error-notice";

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

  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
      >
        ← Nuevo análisis
      </Link>

      <div className="mt-8">
        <PaperHeader paper={paper} />
      </div>

      <div className="mt-8">
        <MetricsGrid paper={paper} />
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          El cuartil corresponde a la revista, no al artículo.
        </p>
      </div>

      <Section title="Información bibliográfica">
        <BibliographicInfo paper={paper} />
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

      <Section title="Abstract">
        <Abstract abstract={paper.abstract} />
      </Section>

      <Section title="Fuentes">
        <SourceLinks paper={paper} />
      </Section>
    </main>
  );
}
