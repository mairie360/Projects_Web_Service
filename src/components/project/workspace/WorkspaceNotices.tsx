import { Skeleton } from '@mairie360/lib-components/primitives';

/** First paint, before the projects page is read. */
export const WorkspaceLoading = () => (
  <section className="projects-initial-loading mx-auto w-full max-w-[1660px] px-6 py-10 lg:px-14 lg:py-14" aria-busy="true">
    <h1 className="text-2xl font-bold leading-tight text-[#172033]">Projets</h1>
    <p role="status" className="mt-4 text-sm text-[#536171]">Chargement du tableau des projets...</p>
    <Skeleton className="mt-8 min-h-80" />
  </section>
);

export const LogoutErrorNotice = ({ message, onBackToLogin }: { message: string; onBackToLogin: () => void }) => (
  <div role="alert" className="mb-5 rounded-md border border-[#ffcecb] bg-[#ffebe9] p-4 text-sm text-[#cf222e] [overflow-wrap:anywhere]">
    <p>{message}</p>
    <button type="button" onClick={onBackToLogin} className="mt-3 min-h-11 rounded-md border border-[#d0d7de] bg-white px-3 py-2 font-semibold text-[#24292f]">
      Retour à la connexion
    </button>
  </div>
);

export interface VerificationNoticeProps {
  title: string;
  message: string;
  error?: string;
  pending: boolean;
  label: string;
  pendingLabel: string;
  onVerify: () => void;
}

/** A write whose receipt could not be confirmed: what happened and the verification read. */
export const VerificationNotice = ({ title, message, error, pending, label, pendingLabel, onVerify }: VerificationNoticeProps) => (
  <div role="alert" className="mb-5 rounded-md border border-[#ffcecb] bg-[#ffebe9] p-4 text-sm text-[#cf222e] [overflow-wrap:anywhere]">
    <p className="font-semibold">{title}</p>
    <p>{message}</p>
    {error && <p className="mt-2">{error}</p>}
    <button type="button" disabled={pending} aria-busy={pending} onClick={onVerify} className="mt-3 min-h-11 rounded-md border border-[#d0d7de] bg-white px-3 py-2 font-semibold text-[#24292f] disabled:opacity-60">
      {pending ? pendingLabel : label}
    </button>
  </div>
);

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
