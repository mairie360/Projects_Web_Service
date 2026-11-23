'use client';

import React from 'react';
import {
  Button,
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
import { ChevronDown, Copy, ExternalLink, Pencil, Trash2 } from 'lucide-react';

import type { TaskColumnStatus } from '@/components/ProjectsWorkspace/components/ProjectPage/use-detail-task-form';

export type TaskMenuColumn = { status: TaskColumnStatus; label: string; disabled?: boolean };

export interface TaskActionsMenuProps {
  title: string;
  column: TaskColumnStatus;
  columns: readonly TaskMenuColumn[];
  disabled?: boolean;
  /** « Ouvrir la tâche » (cards and rows; absent on the task page itself). */
  onOpen?: () => void;
  /** « Modifier la tâche »; absent without the right to edit it. */
  onEdit?: () => void;
  /** « Dupliquer » (task page). */
  onDuplicate?: () => void;
  /** « Changer l’état »; absent without the right to change the task status. */
  onMove?: (status: TaskColumnStatus) => void;
  /** Absent without the right to delete the task. */
  onDelete?: () => void;
  /**
   * `status`: the trigger is the state of the task (a pill with its chevron, MAIR-1137 C15) and the menu only offers
   * the states; `more` (default): the « … » of a card, a row or the task page.
   */
  trigger?: 'more' | 'status';
  size?: 's' | 'm';
}

/**
 * « … » of a task (MAIR-859, MAIR-1137 C15, Figma F6): Ouvrir la tâche, Modifier, Dupliquer, « Changer l’état » (the
 * keyboard and touch alternative to the drag and drop) and Supprimer la tâche, shared by the board cards, the list rows
 * and the task page. Items are `asChild` buttons, the lib radio items get their role and keys.
 */
export function TaskActionsMenu({ title, column, columns, disabled = false, onOpen, onEdit, onDuplicate, onMove, onDelete, trigger = 'more', size = 's' }: TaskActionsMenuProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const statusOnly = trigger === 'status';
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const choose = (status: TaskColumnStatus) => {
    close();
    if (status !== column) onMove?.(status);
  };
  const item = (label: string, Icon: typeof Pencil, action: () => void) => (
    <DropdownMenuItem asChild>
      <button type="button" role="menuitem" className="flex w-full items-center gap-2 text-left" onClick={() => { close(); action(); }}>
        <Icon aria-hidden className="h-4 w-4" />{label}
      </button>
    </DropdownMenuItem>
  );
  const current = columns.find((option) => option.status === column)?.label ?? column;

  return (
    <div className="shrink-0" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          {statusOnly ? (
            <Button ref={triggerRef} variant="outline" tone="neutral" size="s" icon={ChevronDown} iconPosition="end" label={current} aria-label={`État : ${current}, changer l’état`} aria-haspopup="menu" aria-expanded={open} disabled={disabled || !onMove} />
          ) : (
            <MoreIconButton ref={triggerRef} label={`Actions pour ${title}`} aria-haspopup="menu" aria-expanded={open} size={size} />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent role="menu" align="end" aria-label={statusOnly ? `État de ${title}` : `Actions pour ${title}`} className="w-56">
          {!statusOnly && (
            <>
              <DropdownMenuLabel>{title}</DropdownMenuLabel>
              {onOpen && item('Ouvrir la tâche', ExternalLink, onOpen)}
              {onEdit && item('Modifier la tâche', Pencil, onEdit)}
              {onDuplicate && !disabled && item('Dupliquer', Copy, onDuplicate)}
            </>
          )}
          {onMove && (
            <>
              {!statusOnly && <DropdownMenuSeparator />}
              <DropdownMenuLabel>Changer l’état</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={column} onValueChange={(status) => choose(status as TaskColumnStatus)}>
                {columns.map((option) => (
                  // The lib radio item is a bare div: role, state and keyboard activation are added here.
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
          {onDelete && !statusOnly && (
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
