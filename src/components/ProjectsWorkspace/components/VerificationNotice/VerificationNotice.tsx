import { Button, ErrorAlert } from '@mairie360/lib-components/primitives';

export interface VerificationNoticeProps {
  title: string;
  message: string;
  error?: string;
  pending: boolean;
  label: string;
  pendingLabel: string;
  onVerify: () => void;
}

/**
 * A write whose receipt could not be confirmed: what happened and the verification read, on the lib
 * ErrorAlert (MAIR-828). It stays until the verification answers, so it is an alert and not a toast; the
 * action is a lib Button because it must stay disabled while the verification runs.
 */
export const VerificationNotice = ({ title, message, error, pending, label, pendingLabel, onVerify }: VerificationNoticeProps) => (
  <ErrorAlert
    className="mb-5 [overflow-wrap:anywhere]"
    title={title}
    description={(
      <>
        <span className="block">{message}</span>
        {error && <span className="mt-2 block">{error}</span>}
        <span className="mt-2 block">
          <Button variant="outline" tone="danger" size="s" label={pending ? pendingLabel : label} disabled={pending} aria-busy={pending} onClick={onVerify} />
        </span>
      </>
    )}
  />
);
