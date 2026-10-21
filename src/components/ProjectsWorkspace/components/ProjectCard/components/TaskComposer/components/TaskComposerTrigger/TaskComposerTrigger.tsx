'use client';

import { Plus } from 'lucide-react';
import { TaskCreationNotice, type TaskCreationState } from '../../../../../TaskCreationNotice';

export function TaskComposerTrigger({
  creationState,
  blocked,
  onInspect,
  onOpen,
}: {
  creationState?: TaskCreationState;
  blocked: boolean;
  onInspect?: () => void | Promise<void>;
  onOpen: () => void;
}) {
  return (
    <div onClick={(event) => event.stopPropagation()}>
      <TaskCreationNotice state={creationState} onInspect={onInspect} />
      <button
        type="button"
        disabled={creationState?.pending}
        aria-busy={!!creationState?.pending}
        className="mt-3 flex h-8 w-full items-center gap-2 rounded-md border border-dashed border-[#d0d7de] bg-[#f6f8fa] px-2.5 text-left text-xs font-semibold text-[#57606a] transition hover:border-[#0969da] hover:bg-[#ddf4ff] hover:text-[#0969da]"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        {blocked ? 'Création à inspecter' : 'Ajouter une tâche'}
      </button>
    </div>
  );
}
