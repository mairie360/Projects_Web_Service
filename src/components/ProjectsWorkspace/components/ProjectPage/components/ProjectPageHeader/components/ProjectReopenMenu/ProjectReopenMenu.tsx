import React from 'react';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@mairie360/lib-components/primitives';
import { RotateCcw } from 'lucide-react';

import { projectStatusLabel, REOPEN_STATUSES } from '../../../../../../project-card-meta';
import type { Project } from '@/types/project';

export interface ProjectReopenMenuProps {
  onReopen: (status: Project['status']) => void;
  disabled?: boolean;
}

/** « Rouvrir » of a closed project: a menu « Rouvrir le projet en » lists the open statuses to reopen it in. */
export const ProjectReopenMenu = ({ onReopen, disabled = false }: ProjectReopenMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const choose = (status: Project['status']) => () => {
    setOpen(false);
    triggerRef.current?.focus();
    onReopen(status);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button ref={triggerRef} variant="outline" tone="neutral" size="m" icon={RotateCcw} label="Rouvrir" disabled={disabled} aria-haspopup="menu" aria-expanded={open} />
      </DropdownMenuTrigger>
      <DropdownMenuContent role="menu" align="end" aria-label="Rouvrir le projet en" className="w-52">
        <DropdownMenuLabel>Rouvrir le projet en</DropdownMenuLabel>
        {REOPEN_STATUSES.map((status) => (
          <DropdownMenuItem key={status} asChild>
            <button type="button" role="menuitem" className="flex w-full items-center gap-2 text-left" onClick={choose(status)}>
              {projectStatusLabel(status)}
            </button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
