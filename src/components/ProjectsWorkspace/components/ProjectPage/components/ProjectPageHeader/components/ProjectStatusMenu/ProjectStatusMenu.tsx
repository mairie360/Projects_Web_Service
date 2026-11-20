import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, StatusBadge } from '@mairie360/lib-components/primitives';
import { ChevronDown } from 'lucide-react';

import { projectStatusBadge, projectStatusLabel } from '../../../../../../project-card-meta';
import type { Project } from '@/types/project';

const STATUSES: Project['status'][] = ['todo', 'in-progress', 'review', 'done'];

export interface ProjectStatusMenuProps {
  status: Project['status'];
  /** Without it the status is shown, not clickable (no right to change it). */
  onChange?: (status: Project['status']) => void;
  disabled?: boolean;
}

/** MAIR-846 (Figma F5 5.4): the status pill of the project page opens the choice of the status. */
export const ProjectStatusMenu = ({ status, onChange, disabled = false }: ProjectStatusMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  if (!onChange) return <StatusBadge status={projectStatusBadge[status]} />;

  const choose = (next: Project['status']) => {
    setOpen(false);
    triggerRef.current?.focus();
    if (next !== status) onChange(next);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Statut : ${projectStatusLabel(status)}. Changer le statut`}
          className="inline-flex items-center gap-1 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mairie-focus,#0969da)] disabled:opacity-60"
        >
          <StatusBadge status={projectStatusBadge[status]} />
          <ChevronDown aria-hidden className="h-3.5 w-3.5 text-[var(--mairie-text-muted)]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent role="menu" align="start" aria-label="Changer le statut" className="w-52">
        <DropdownMenuLabel>Changer le statut</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={status} onValueChange={(value) => choose(value as Project['status'])}>
          {STATUSES.map((value) => (
            // The lib radio item is a bare div (lib-components 2.1.0): role, state and keyboard activation are added here.
            <DropdownMenuRadioItem
              key={value}
              value={value}
              role="menuitemradio"
              aria-checked={status === value}
              tabIndex={0}
              onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                choose(value);
              }}
            >
              {projectStatusLabel(value)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
