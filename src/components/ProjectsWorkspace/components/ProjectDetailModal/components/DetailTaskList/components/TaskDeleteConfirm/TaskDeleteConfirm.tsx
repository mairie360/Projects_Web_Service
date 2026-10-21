export interface TaskDeleteConfirmProps {
  cancelDisabled: boolean;
  confirmDisabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Inline confirmation before a task is deleted for good. */
export const TaskDeleteConfirm = ({ cancelDisabled, confirmDisabled, onCancel, onConfirm }: TaskDeleteConfirmProps) => (
  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#ffcecb] bg-[#ffebe9] p-2 text-xs text-[#cf222e]">
    <span>Supprimer définitivement cette tâche ?</span>
    <span className="flex gap-2">
      <button type="button" disabled={cancelDisabled} className="rounded-md border border-[#d0d7de] bg-white px-2 py-1 font-semibold text-[#24292f]" onClick={onCancel}>Annuler</button>
      <button type="button" disabled={confirmDisabled} className="rounded-md bg-[#cf222e] px-2 py-1 font-semibold text-white" onClick={onConfirm}>
        Supprimer
      </button>
    </span>
  </div>
);
