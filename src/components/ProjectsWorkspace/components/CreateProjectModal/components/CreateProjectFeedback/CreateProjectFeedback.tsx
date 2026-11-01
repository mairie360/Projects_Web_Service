import React from 'react';

export interface CreateProjectFeedbackProps {
  feedbackId: string;
  feedbackRef: React.Ref<HTMLDivElement>;
  pending: boolean;
  error?: string;
  verificationRequired: boolean;
  verificationMessage: string;
  verificationError?: string;
  verificationPending: boolean;
  verificationLabel: string;
  verificationPendingLabel: string;
  confirmedCreationTitle?: string;
  onVerify: () => void;
}

/** Pending save, unverified receipt with its verification read, verified creation, or refusal. */
export const CreateProjectFeedback = ({
  feedbackId, feedbackRef, pending, error, verificationRequired, verificationMessage, verificationError, verificationPending,
  verificationLabel, verificationPendingLabel, confirmedCreationTitle, onVerify,
}: CreateProjectFeedbackProps) => (
  <>
    {pending && <p id={feedbackId} role="status" className="mb-4 text-sm font-medium text-[#24292f]">Enregistrement en cours…</p>}
    {verificationRequired && (
      <div ref={feedbackRef} tabIndex={-1} id={feedbackId} role="alert" className="mb-4 rounded-md border border-[#ffcecb] bg-[#ffebe9] px-4 py-3 text-sm font-medium text-[#cf222e] [overflow-wrap:anywhere]">
        <p>{verificationMessage}</p>
        {verificationError && <p className="mt-2">{verificationError}</p>}
        <button type="button" disabled={verificationPending || pending} aria-busy={verificationPending} onClick={onVerify} className="mt-3 min-h-11 rounded-md border border-[#d0d7de] bg-white px-3 py-2 font-semibold text-[#24292f] disabled:opacity-60">
          {verificationPending ? verificationPendingLabel : verificationLabel}
        </button>
      </div>
    )}
    {confirmedCreationTitle !== undefined && (
      <div ref={feedbackRef} tabIndex={-1} id={feedbackId} role="status" className="mb-4 rounded-md border border-[#9ac5e5] bg-[#ddf4ff] px-4 py-3 text-sm text-[#24292f] [overflow-wrap:anywhere]">
        <p className="font-semibold">Création vérifiée : {confirmedCreationTitle}</p>
        <p>La fiche a été vérifiée par lecture, sans répéter la création. Votre brouillon reste ci-dessous et ne sera pas renvoyé. Fermez ce formulaire pour démarrer un autre projet.</p>
      </div>
    )}
    {error && !verificationRequired && (
      <div id={feedbackId} role="alert" className="mb-4 rounded-md border border-[#ffcecb] bg-[#ffebe9] px-4 py-3 text-sm font-medium text-[#cf222e]">
        {error}
      </div>
    )}
  </>
);
