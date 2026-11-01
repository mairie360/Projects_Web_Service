import { Skeleton } from '@mairie360/lib-components/primitives';

/** First paint, before the projects page is read. */
export const WorkspaceLoading = () => (
  <section className="projects-initial-loading mx-auto w-full max-w-[1660px] px-6 py-10 lg:px-14 lg:py-14" aria-busy="true">
    <h1 className="text-2xl font-bold leading-tight text-[#172033]">Projets</h1>
    <p role="status" className="mt-4 text-sm text-[#536171]">Chargement du tableau des projets...</p>
    <Skeleton className="mt-8 min-h-80" />
  </section>
);
