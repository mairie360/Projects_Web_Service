export interface ProjectLifecycleProps {
  disabled: boolean;
  onSuspend: () => void;
  onClose: () => void;
}

/** Suspend (review) or close (done) the project. */
export const ProjectLifecycle = ({ disabled, onSuspend, onClose }: ProjectLifecycleProps) => (
  <div className="border-t border-[#dedbd6] pt-4">
    <h3 className="text-sm font-semibold text-[#24292f]">Cycle de vie</h3>
    <p className="mt-1 text-xs text-[#57606a]">Clôturez le projet terminé ou suspendez-le temporairement.</p>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" disabled={disabled} className="h-9 rounded-md border border-[#d0d7de] bg-white text-xs font-semibold text-[#57606a] hover:bg-[#f1eee9]" onClick={onSuspend}>
        Suspendre
      </button>
      <button type="button" disabled={disabled} className="h-9 rounded-md bg-[#1a7f37] text-xs font-semibold text-white hover:bg-[#116329]" onClick={onClose}>
        Clôturer
      </button>
    </div>
  </div>
);
