import { Button } from '@mairie360/lib-components/primitives';
import { Check } from 'lucide-react';

export interface CreateProjectFooterProps {
  editing: boolean;
  pending: boolean;
  creationConfirmed: boolean;
  submitBlocked: boolean;
  onClose: () => void;
}

export const submitLabel = ({ editing, pending, creationConfirmed }: Pick<CreateProjectFooterProps, 'editing' | 'pending' | 'creationConfirmed'>) =>
  pending ? 'Enregistrement en cours…' : editing ? 'Enregistrer' : creationConfirmed ? 'Création vérifiée' : 'Créer le projet';

/** Cancel (or "Fermer" once the creation is verified) and the submit button (Figma F3: « Annuler », « Créer le projet »). */
export const CreateProjectFooter = ({ editing, pending, creationConfirmed, submitBlocked, onClose }: CreateProjectFooterProps) => (
  <div className="flex flex-col-reverse gap-3 border-t border-[var(--mairie-border)] bg-[var(--mairie-surface-raised)] px-5 py-3 sm:flex-row sm:justify-end">
    <Button variant="outline" tone="neutral" label={creationConfirmed ? 'Fermer' : 'Annuler'} disabled={pending} type="button" onClick={onClose} />
    <Button
      variant="solid"
      tone="primary"
      icon={Check}
      loading={pending}
      label={submitLabel({ editing, pending, creationConfirmed })}
      disabled={submitBlocked}
      type="submit"
    />
  </div>
);
