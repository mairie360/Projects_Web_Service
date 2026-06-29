'use client';

import React from 'react';
import { ToolTip } from '@mairie360/lib-components';
import { MoreHorizontal } from 'lucide-react';

import type { Project } from '../../types/project';

export function ProjectActionsMenu({
  project,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  project: Project;
  onEdit?: (project: Project) => void;
  onDuplicate?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const runAction = (action?: (project: Project) => void) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen(false);
    action?.(project);
  };

  return (
    <div
      ref={menuRef}
      className="relative shrink-0"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <ToolTip text="Actions">
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#57606a] transition hover:bg-[#f6f8fa] hover:text-[#24292f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da]/30"
          aria-label={`Actions pour ${project.title}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((current) => !current);
          }}
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </ToolTip>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+4px)] z-50 w-36 overflow-hidden rounded-md border border-[#d0d7de] bg-white py-1 text-sm text-[#24292f] shadow-[0_8px_24px_rgba(140,149,159,0.2)]"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="flex h-9 w-full items-center px-3 text-left transition hover:bg-[#0969da] hover:text-white"
            onClick={runAction(onEdit)}
          >
            Modifier
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex h-9 w-full items-center px-3 text-left transition hover:bg-[#0969da] hover:text-white"
            onClick={runAction(onDuplicate)}
          >
            Dupliquer
          </button>
          <div className="my-1 border-t border-[#d8dee4]" />
          <button
            type="button"
            role="menuitem"
            className="flex h-9 w-full items-center px-3 text-left text-[#cf222e] transition hover:bg-[#ffebe9]"
            onClick={runAction(onDelete)}
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

