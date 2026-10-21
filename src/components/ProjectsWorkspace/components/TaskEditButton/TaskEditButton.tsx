'use client';

import { PencilLine } from 'lucide-react';

export function TaskEditButton({ onClick, disabled = false }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-[#0969da] bg-[#ddf4ff] px-3 text-xs font-semibold text-[#0969da] shadow-sm transition hover:border-[#0550ae] hover:bg-[#b6e3ff] hover:text-[#0550ae] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da]/30"
      onClick={onClick}
    >
      <PencilLine className="h-3.5 w-3.5" strokeWidth={2} />
      Modifier
    </button>
  );
}
