'use client';

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  MoreIconButton,
  ToolTip,
} from '@mairie360/lib-components/primitives';

import type { Project } from '@/types/project';

/** « Modifier / Dupliquer / Supprimer » of a project, on the lib DropdownMenu (MAIR-828). */
export function ProjectActionsMenu({
  project,
  onEdit,
  onDuplicate,
  duplicationPending = false,
  duplicationVerificationRequired = false,
  onDelete,
}: {
  project: Project;
  onEdit?: (project: Project) => void;
  onDuplicate?: (project: Project) => void;
  duplicationPending?: boolean;
  duplicationVerificationRequired?: boolean;
  onDelete?: (project: Project) => void;
}) {
  const canEdit = project.permissions?.canEdit !== false && Boolean(onEdit);
  const canDuplicate = project.permissions?.canDuplicate !== false && Boolean(onDuplicate);
  const canDelete = project.permissions?.canDelete !== false && Boolean(onDelete);
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  if (!canEdit && !canDuplicate && !canDelete) return null;

  const runAction = (action?: (project: Project) => void) => (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    triggerRef.current?.focus();
    action?.(project);
  };
  const duplicateBlocked = duplicationPending || duplicationVerificationRequired;

  return (
    <div className="shrink-0" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <ToolTip text="Actions">
          <DropdownMenuTrigger asChild>
            <MoreIconButton
              ref={triggerRef}
              label={`Actions pour ${project.title}`}
              aria-haspopup="menu"
              aria-expanded={open}
              size="s"
            />
          </DropdownMenuTrigger>
        </ToolTip>
        <DropdownMenuContent role="menu" align="end" aria-label={`Actions pour ${project.title}`} className="w-40">
          {canEdit && (
            <DropdownMenuItem asChild>
              <button type="button" role="menuitem" className="w-full text-left" onClick={runAction(onEdit)}>Modifier</button>
            </DropdownMenuItem>
          )}
          {canDuplicate && (
            <DropdownMenuItem asChild disabled={duplicateBlocked}>
              <button
                type="button"
                role="menuitem"
                disabled={duplicateBlocked}
                aria-busy={duplicationPending || undefined}
                className="w-full text-left"
                onClick={runAction(onDuplicate)}
              >
                {duplicationVerificationRequired ? 'Copie à vérifier' : 'Dupliquer'}
              </button>
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem asChild variant="destructive">
              <button type="button" role="menuitem" className="w-full text-left" onClick={runAction(onDelete)}>Supprimer</button>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
