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
