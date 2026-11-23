import { ConfirmModal } from '@mairie360/lib-components/primitives';

export interface TaskDeleteConfirmProps {
  cancelDisabled: boolean;
  confirmDisabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmation before a task is deleted for good, on the lib ConfirmModal (MAIR-828). */
export const TaskDeleteConfirm = ({ cancelDisabled, confirmDisabled, onCancel, onConfirm }: TaskDeleteConfirmProps) => (
  <ConfirmModal
    open
    title="Supprimer la tâche ?"
    message="Supprimer définitivement cette tâche ?"
    confirmLabel="Supprimer"
    destructive
    busy={cancelDisabled && confirmDisabled}
    initialFocus="cancel"
    onCancel={() => { if (!cancelDisabled) onCancel(); }}
    onConfirm={() => { if (!confirmDisabled) onConfirm(); }}
  />
);
