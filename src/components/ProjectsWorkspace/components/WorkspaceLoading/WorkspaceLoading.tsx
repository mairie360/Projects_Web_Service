import { PageHeader, Skeleton } from '@mairie360/lib-components/primitives';
import { PROJECT_COLUMN_ORDER } from '../../project-card-meta';

/** First paint, before the projects page is read: the lib PageHeader and one Skeleton per Kanban column (MAIR-828). */
export const WorkspaceLoading = () => (
  <section className="projects-initial-loading w-full p-6" aria-busy="true">
    <PageHeader title="Projets" />
    <p role="status" className="mt-4 text-sm text-[var(--mairie-text-muted)]">Chargement du tableau des projets...</p>
    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      {PROJECT_COLUMN_ORDER.map((column) => (
        <div key={column} className="flex flex-col gap-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton.Card />
          <Skeleton.Card />
        </div>
      ))}
    </div>
  </section>
);
