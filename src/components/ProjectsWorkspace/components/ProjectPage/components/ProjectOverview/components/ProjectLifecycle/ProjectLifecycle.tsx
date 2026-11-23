export interface ProjectLifecycleProps {
  disabled: boolean;
  /** MAIR-1084: the project is on hold (« Suspendu »): « Reprendre » replaces « Suspendre ». */
  onHold?: boolean;
  onSuspend: () => void;
  /** Puts a project on hold back in progress; without it, « Reprendre » is not offered. */
  onResume?: () => void;
  onClose: () => void;
}

/** Suspend (on hold, MAIR-1084), resume or close (done) the project. */
export const ProjectLifecycle = ({ disabled, onHold = false, onSuspend, onResume, onClose }: ProjectLifecycleProps) => (
  <div className="border-t border-[#dedbd6] pt-4">
    <h3 className="text-sm font-semibold text-[#24292f]">Cycle de vie</h3>
    <p className="mt-1 text-xs text-[#57606a]">
      {onHold ? 'Le projet est suspendu : reprenez-le ou clôturez-le.' : 'Clôturez le projet terminé ou suspendez-le temporairement.'}
    </p>
    <div className="mt-3 grid grid-cols-2 gap-2">
      {onHold ? (
        onResume && (
          <button type="button" disabled={disabled} className="h-9 rounded-md border border-[#d0d7de] bg-white text-xs font-semibold text-[#57606a] hover:bg-[#f1eee9]" onClick={onResume}>
            Reprendre
          </button>
        )
      ) : (
        <button type="button" disabled={disabled} className="h-9 rounded-md border border-[#d0d7de] bg-white text-xs font-semibold text-[#57606a] hover:bg-[#f1eee9]" onClick={onSuspend}>
          Suspendre
        </button>
      )}
      <button type="button" disabled={disabled} className="h-9 rounded-md bg-[#1a7f37] text-xs font-semibold text-white hover:bg-[#116329]" onClick={onClose}>
        Clôturer
      </button>
    </div>
  </div>
);
