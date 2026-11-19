'use client';

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  MoreIconButton,
  ToolTip,
} from '@mairie360/lib-components/primitives';
import { Copy, ExternalLink, Trash2 } from 'lucide-react';

import type { Project } from '@/types/project';
import { projectStatusLabel } from '../../../../project-card-meta';

const STATUSES: Project['status'][] = ['todo', 'in-progress', 'review', 'done'];

/**
 * « … » menu of a project (MAIR-829, Figma F4): Ouvrir le projet, Dupliquer, Changer le statut (single choice),
 * Supprimer (confirmed by the page). Items are `asChild` buttons so they keep `role`, `disabled` and keyboard activation.
 */
export function ProjectActionsMenu({
  project,
  onOpen,
  onDuplicate,
  duplicationPending = false,
  duplicationVerificationRequired = false,
  onDelete,
  onChangeStatus,
}: {
  project: Project;
  onOpen?: (project: Project) => void;
  onDuplicate?: (project: Project) => void;
  duplicationPending?: boolean;
  duplicationVerificationRequired?: boolean;
  onDelete?: (project: Project) => void;
  onChangeStatus?: (project: Project, status: Project['status']) => void | Promise<void>;
}) {
  const canOpen = project.permissions?.canView !== false && Boolean(onOpen);
  const canDuplicate = project.permissions?.canDuplicate !== false && Boolean(onDuplicate);
  const canChangeStatus = project.permissions?.canEdit === true && Boolean(onChangeStatus);
  const canDelete = project.permissions?.canDelete !== false && Boolean(onDelete);
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  if (!canOpen && !canDuplicate && !canChangeStatus && !canDelete) return null;

  const runAction = (action?: (project: Project) => void) => (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setOpen(false);
    triggerRef.current?.focus();
    action?.(project);
  };
  const duplicateBlocked = duplicationPending || duplicationVerificationRequired;
  const chooseStatus = (status: Project['status']) => {
    setOpen(false);
    triggerRef.current?.focus();
    if (status !== project.status) void onChangeStatus?.(project, status);
  };

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
        <DropdownMenuContent role="menu" align="end" aria-label={`Actions pour ${project.title}`} className="w-60">
          <DropdownMenuLabel>{project.title}</DropdownMenuLabel>
          {canOpen && (
            <DropdownMenuItem asChild>
              <button type="button" role="menuitem" className="flex w-full items-center gap-2 text-left" onClick={runAction(onOpen)}>
                <ExternalLink aria-hidden className="h-4 w-4" />Ouvrir le projet
              </button>
            </DropdownMenuItem>
          )}
          {canDuplicate && (
            <DropdownMenuItem asChild disabled={duplicateBlocked}>
              <button
                type="button"
                role="menuitem"
                disabled={duplicateBlocked}
                aria-busy={duplicationPending || undefined}
                className="flex w-full items-center gap-2 text-left"
                onClick={runAction(onDuplicate)}
              >
                <Copy aria-hidden className="h-4 w-4" />{duplicationVerificationRequired ? 'Copie à vérifier' : 'Dupliquer'}
              </button>
            </DropdownMenuItem>
          )}
          {canChangeStatus && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Changer le statut</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={project.status} onValueChange={(status) => chooseStatus(status as Project['status'])}>
                {STATUSES.map((status) => (
                  // The lib radio item is a bare div (lib-components 2.1.0): role, state and keyboard activation are added here.
                  <DropdownMenuRadioItem
                    key={status}
                    value={status}
                    role="menuitemradio"
                    aria-checked={project.status === status}
                    tabIndex={0}
                    onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      chooseStatus(status);
                    }}
                  >
                    {projectStatusLabel(status)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild variant="destructive">
                <button type="button" role="menuitem" className="flex w-full items-center gap-2 text-left" onClick={runAction(onDelete)}>
                  <Trash2 aria-hidden className="h-4 w-4" />Supprimer
                </button>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
