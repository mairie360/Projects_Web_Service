import { Button } from '@mairie360/lib-components/primitives';

export interface CreateProjectFooterProps {
  editing: boolean;
  pending: boolean;
  creationConfirmed: boolean;
  submitBlocked: boolean;
  onClose: () => void;
}

export const submitLabel = ({ editing, pending, creationConfirmed }: Pick<CreateProjectFooterProps, 'editing' | 'pending' | 'creationConfirmed'>) =>
  pending ? 'Enregistrement en cours…' : editing ? 'Enregistrer' : creationConfirmed ? 'Création vérifiée' : 'Créer le projet';

/** Cancel (or "Fermer" once the creation is verified) and the submit button. */
export const CreateProjectFooter = ({ editing, pending, creationConfirmed, submitBlocked, onClose }: CreateProjectFooterProps) => (
  <div className="flex flex-col-reverse gap-3 border-t border-[#dedbd6] bg-[#fbfaf8] px-5 py-3 sm:flex-row sm:justify-end">
    <Button variant="outline" tone="neutral"
      label={creationConfirmed ? 'Fermer' : 'Annuler'}
      disabled={pending}
      type="button"
      onClick={onClose}
      className="!h-9 !min-h-0 !rounded-md !border-[#d9d5d0] !bg-[#fbfaf8] !px-4 !text-sm !font-semibold !text-[#24292f] hover:!bg-[#f1eee9]"
    />
    <Button
      label={submitLabel({ editing, pending, creationConfirmed })}
      disabled={submitBlocked}
      type="submit"
      className={`!h-9 !min-h-0 !rounded-md !px-4 !text-sm !font-semibold !text-white ${submitBlocked ? '!border-[#a5bca9] !bg-[#a5bca9] !cursor-not-allowed' : '!border-[#2da44e] !bg-[#2da44e] hover:!bg-[#2c974b]'}`}
    />
  </div>
);
