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
} from '@mairie360/lib-components/primitives';
import { ExternalLink, Trash2 } from 'lucide-react';

import type { TaskColumnStatus } from '@/components/ProjectsWorkspace/components/ProjectPage/use-detail-task-form';

export type TaskCardMenuColumn = { status: TaskColumnStatus; label: string; disabled?: boolean };

/**
 * « … » of a task card (MAIR-859, Figma F6): Ouvrir la tâche, « Déplacer vers » (the keyboard and touch alternative to
 * the drag and drop) and Supprimer la tâche. Items are `asChild` buttons, the lib radio items get their role and keys.
 */
export function TaskCardMenu({ title, column, columns, disabled = false, onOpen, onMove, onDelete }: {
  title: string;
  column: TaskColumnStatus;
  columns: readonly TaskCardMenuColumn[];
  disabled?: boolean;
  onOpen: () => void;
  /** Absent without the right to change the task status. */
  onMove?: (status: TaskColumnStatus) => void;
  /** Absent without the right to delete the task. */
  onDelete?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const choose = (status: TaskColumnStatus) => {
    close();
    if (status !== column) onMove?.(status);
  };

  return (
    <div className="shrink-0" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <MoreIconButton ref={triggerRef} label={`Actions pour ${title}`} aria-haspopup="menu" aria-expanded={open} size="s" />
        </DropdownMenuTrigger>
        <DropdownMenuContent role="menu" align="end" aria-label={`Actions pour ${title}`} className="w-56">
          <DropdownMenuLabel>{title}</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <button type="button" role="menuitem" className="flex w-full items-center gap-2 text-left" onClick={() => { close(); onOpen(); }}>
              <ExternalLink aria-hidden className="h-4 w-4" />Ouvrir la tâche
            </button>
          </DropdownMenuItem>
          {onMove && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Déplacer vers</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={column} onValueChange={(status) => choose(status as TaskColumnStatus)}>
                {columns.map((option) => (
                  // The lib radio item is a bare div (lib-components 2.1.0): role, state and keyboard activation are added here.
                  <DropdownMenuRadioItem
                    key={option.status}
                    value={option.status}
                    role="menuitemradio"
                    aria-checked={column === option.status}
                    aria-disabled={disabled || option.disabled || undefined}
                    disabled={disabled || option.disabled}
                    tabIndex={0}
                    onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      if (!disabled && !option.disabled) choose(option.status);
                    }}
                  >
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild variant="destructive" disabled={disabled}>
                <button type="button" role="menuitem" disabled={disabled} className="flex w-full items-center gap-2 text-left" onClick={() => { close(); onDelete(); }}>
                  <Trash2 aria-hidden className="h-4 w-4" />Supprimer la tâche
                </button>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
