import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, MoreIconButton, ToolTip } from '@mairie360/lib-components/primitives';
import { Copy, Pencil, Trash2 } from 'lucide-react';

export interface ProjectMoreMenuProps {
  title: string;
  /** MAIR-1134 (C14): « Modifier », first entry of the menu. */
  onEdit?: () => void;
  editDisabled?: boolean;
  onDuplicate?: () => void;
  duplicateDisabled?: boolean;
  duplicateLabel?: string;
  onDelete?: () => void;
}

/** MAIR-846 (Figma F5 5.8): « Plus d’actions » of the project page — Modifier (MAIR-1134), Dupliquer, Supprimer. */
export const ProjectMoreMenu = ({ title, onEdit, editDisabled = false, onDuplicate, duplicateDisabled = false, duplicateLabel = 'Dupliquer', onDelete }: ProjectMoreMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  if (!onEdit && !onDuplicate && !onDelete) return null;
  const run = (action?: () => void) => () => {
    setOpen(false);
    triggerRef.current?.focus();
    action?.();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <ToolTip text="Plus d’actions">
        <DropdownMenuTrigger asChild>
          <MoreIconButton ref={triggerRef} label={`Plus d’actions pour ${title}`} aria-haspopup="menu" aria-expanded={open} />
        </DropdownMenuTrigger>
      </ToolTip>
      <DropdownMenuContent role="menu" align="end" aria-label={`Plus d’actions pour ${title}`} className="w-52">
        {onEdit && (
          <DropdownMenuItem asChild disabled={editDisabled}>
            <button type="button" role="menuitem" disabled={editDisabled} className="flex w-full items-center gap-2 text-left" onClick={run(onEdit)}>
              <Pencil aria-hidden className="h-4 w-4" />Modifier
            </button>
          </DropdownMenuItem>
        )}
        {onDuplicate && (
          <DropdownMenuItem asChild disabled={duplicateDisabled}>
            <button type="button" role="menuitem" disabled={duplicateDisabled} className="flex w-full items-center gap-2 text-left" onClick={run(onDuplicate)}>
              <Copy aria-hidden className="h-4 w-4" />{duplicateLabel}
            </button>
          </DropdownMenuItem>
        )}
        {(onEdit || onDuplicate) && onDelete && <DropdownMenuSeparator />}
        {onDelete && (
          <DropdownMenuItem asChild variant="destructive">
            <button type="button" role="menuitem" className="flex w-full items-center gap-2 text-left" onClick={run(onDelete)}>
              <Trash2 aria-hidden className="h-4 w-4" />Supprimer
            </button>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
