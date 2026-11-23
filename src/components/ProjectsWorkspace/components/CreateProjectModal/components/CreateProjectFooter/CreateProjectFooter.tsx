import { Button, DeleteGhostButton } from '@mairie360/lib-components/primitives';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

export interface CreateProjectFooterProps {
  editing: boolean;
  pending: boolean;
  creationConfirmed: boolean;
  submitBlocked: boolean;
  onClose: () => void;
  /** MAIR-1136 (C9): the creation step (from 0) and the step count; the submit only creates at the last one. */
  step?: number;
  stepCount?: number;
  /** « Passer au récapitulatif », once « L’essentiel » is valid. */
  canSkipToRecap?: boolean;
  onBack?: () => void;
  onSkipToRecap?: () => void;
  /** MAIR-1136 (C13): the fields changed by the edit, « Enregistrer (n) », disabled at 0. */
  changeCount?: number;
  /** MAIR-1136: « Supprimer » on the left of the edit. */
  onDelete?: () => void;
}

export const submitLabel = ({ editing, pending, creationConfirmed, changeCount, lastStep = true }: Pick<CreateProjectFooterProps, 'editing' | 'pending' | 'creationConfirmed' | 'changeCount'> & { lastStep?: boolean }) =>
  pending ? 'Enregistrement en cours…'
    : editing ? (changeCount === undefined ? 'Enregistrer' : `Enregistrer (${changeCount})`)
      : creationConfirmed ? 'Création vérifiée' : lastStep ? 'Créer le projet' : 'Suivant';

/**
 * Cancel (or "Fermer" once the creation is verified) and the submit button (Figma F3: « Annuler », « Créer le
 * projet »). MAIR-1136: « Précédent », « Passer au récapitulatif » and « Suivant » while creating, « Supprimer »
 * and « Enregistrer (n) » while editing.
 */
export const CreateProjectFooter = ({
  editing, pending, creationConfirmed, submitBlocked, onClose, step = 0, stepCount = 1, canSkipToRecap = false, onBack, onSkipToRecap, changeCount, onDelete,
}: CreateProjectFooterProps) => {
  const lastStep = editing || step >= stepCount - 1;
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-[var(--mairie-border)] bg-[var(--mairie-surface-raised)] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2">
        {editing && onDelete && <DeleteGhostButton disabled={pending} type="button" onClick={onDelete} />}
        {!editing && step > 0 && !creationConfirmed && <Button variant="ghost" tone="neutral" icon={ArrowLeft} label="Précédent" disabled={pending} type="button" onClick={onBack} />}
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Button variant="outline" tone="neutral" label={creationConfirmed ? 'Fermer' : 'Annuler'} disabled={pending} type="button" onClick={onClose} />
        {!lastStep && canSkipToRecap && <Button variant="outline" tone="primary" label="Passer au récapitulatif" disabled={pending} type="button" onClick={onSkipToRecap} />}
        <Button
          variant="solid"
          tone="primary"
          icon={lastStep ? Check : ArrowRight}
          loading={pending}
          label={submitLabel({ editing, pending, creationConfirmed, changeCount, lastStep })}
          disabled={submitBlocked || (editing && changeCount === 0)}
          type="submit"
        />
      </div>
    </div>
  );
};
