import { PageHeader, Skeleton } from '@mairie360/lib-components/primitives';

/** First paint, before the projects page is read: the lib PageHeader and one Skeleton per Kanban column (MAIR-828). */
export const WorkspaceLoading = () => (
  <section className="projects-initial-loading mx-auto w-full max-w-[1660px] px-6 py-10 lg:px-14 lg:py-14" aria-busy="true">
    <PageHeader title="Projets" />
    <p role="status" className="mt-4 text-sm text-[var(--mairie-text-muted)]">Chargement du tableau des projets...</p>
    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      {['todo', 'in-progress', 'review', 'on-hold', 'done'].map((column) => (
        <div key={column} className="flex flex-col gap-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton.Card />
          <Skeleton.Card />
        </div>
      ))}
    </div>
  </section>
);
