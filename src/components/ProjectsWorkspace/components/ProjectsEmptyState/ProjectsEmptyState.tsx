import { Button, DataState } from '@mairie360/lib-components/primitives';

/** No project matches the search or the filters; `onReset` offers « Réinitialiser les filtres » (MAIR-829, Figma F2). */
export function ProjectsEmptyState({ onReset }: { onReset?: () => void } = {}) {
  return (
    <DataState
      state="empty"
      title="Aucun projet à afficher"
      description="Aucun projet ne correspond à la recherche ou aux filtres sélectionnés."
      action={onReset ? <Button variant="outline" tone="neutral" label="Réinitialiser les filtres" onClick={onReset} /> : null}
    />
  );
}
