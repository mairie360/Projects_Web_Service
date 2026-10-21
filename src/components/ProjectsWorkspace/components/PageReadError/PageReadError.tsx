export interface PageReadErrorProps {
  error: string;
  /** Projects from the last successful read are still shown. */
  stale: boolean;
  loading: boolean;
  onRetry: () => void;
}

export const PageReadError = ({ error, stale, loading, onRetry }: PageReadErrorProps) => (
  <div role="alert" className="mb-5 rounded-md border border-[#ffcecb] bg-[#ffebe9] px-5 py-4 text-sm font-medium text-[#cf222e]">
    <div>{error}</div>
    {stale && (
      <p className="mt-2">Dernières données reçues et confirmations conservées : la liste n’a pas pu être actualisée. Les statistiques restent celles de la dernière lecture réussie.</p>
    )}
    <button
      type="button"
      disabled={loading}
      aria-busy={loading}
      className="mt-3 rounded-md border border-[#cf222e] bg-white px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cf222e] disabled:cursor-wait disabled:opacity-60"
      onClick={onRetry}
    >
      Réessayer
    </button>
    {loading && <p role="status" className="mt-2">Actualisation des projets...</p>}
  </div>
);
