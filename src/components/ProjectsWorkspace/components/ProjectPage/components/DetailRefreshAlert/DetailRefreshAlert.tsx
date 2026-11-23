export interface DetailRefreshAlertProps {
  error: string;
  verificationRequired: boolean;
  busy: boolean;
  retryDisabled: boolean;
  onRetry: () => void;
}

/** A failed detail read: what stays on screen and the retry. */
export const DetailRefreshAlert = ({ error, verificationRequired, busy, retryDisabled, onRetry }: DetailRefreshAlertProps) => (
  <div role="alert" className="mb-5 rounded-md border border-[#ffcecb] bg-[#ffebe9] p-4 text-sm text-[#cf222e] [overflow-wrap:anywhere]">
    <p>{error}</p>
    <p className="mt-2 text-[#57606a]">{verificationRequired ? 'Le dernier projet vérifié reste affiché. Aucune écriture supplémentaire ne sera envoyée par cette vérification.' : 'Les tâches confirmées restent affichées. Les compteurs et la progression restent ceux de la dernière réponse projet reçue.'}</p>
    <button type="button" disabled={retryDisabled} aria-busy={busy} onClick={onRetry}
      className="mt-3 min-h-11 rounded-md border border-[#d0d7de] bg-white px-3 py-2 font-semibold text-[#24292f] disabled:opacity-60">
      {busy ? 'Actualisation de la fiche…' : 'Réessayer la fiche'}
    </button>
  </div>
);
