import { DataState } from '@mairie360/lib-components/primitives';

/** No project matches the filters. */
export function ProjectsEmptyState() {
  return (
    <DataState state="empty" title="Aucun projet à afficher" description="Aucun projet ne correspond aux filtres sélectionnés." />
  );
}
