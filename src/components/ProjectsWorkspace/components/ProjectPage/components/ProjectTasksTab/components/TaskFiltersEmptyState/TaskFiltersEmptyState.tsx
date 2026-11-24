import { Button, DataState } from '@mairie360/lib-components/primitives';

/** No task matches the search or the filters, in the Tableau and Liste views: « Réinitialiser les filtres » clears them. */
export function TaskFiltersEmptyState({ onReset }: { onReset: () => void }) {
  return (
    <DataState
      state="empty"
      title="Aucune tâche ne correspond aux filtres"
      description="Modifiez ou réinitialisez les filtres pour revoir toutes les tâches du projet."
      action={<Button variant="outline" tone="neutral" label="Réinitialiser les filtres" onClick={onReset} />}
    />
  );
}
