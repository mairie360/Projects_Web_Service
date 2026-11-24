import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, MoreIconButton, ToolTip } from '@mairie360/lib-components/primitives';
import { Copy, MessageSquarePlus, Pencil, Trash2 } from 'lucide-react';

export interface ProjectMoreMenuProps {
  title: string;
  /** MAIR-1134 (C14): « Modifier », first entry of the menu. */
  onEdit?: () => void;
  editDisabled?: boolean;
  onDuplicate?: () => void;
  duplicateDisabled?: boolean;
  duplicateLabel?: string;
  /** « Envoyer un message »: page of the messaging front with the project as context. */
  messageHref?: string;
  onDelete?: () => void;
}

/** MAIR-846 (Figma F5 5.8): « Plus d’actions » of the project page — Modifier (MAIR-1134), Dupliquer, Envoyer un message, Supprimer. */
export const ProjectMoreMenu = ({ title, onEdit, editDisabled = false, onDuplicate, duplicateDisabled = false, duplicateLabel = 'Dupliquer', messageHref, onDelete }: ProjectMoreMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  if (!onEdit && !onDuplicate && !messageHref && !onDelete) return null;
  const run = (action?: () => void) => () => {
    setOpen(false);
    triggerRef.current?.focus();
    action?.();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <ToolTip text="Plus d’actions">
        <DropdownMenuTrigger asChild>
          <MoreIconButton ref={triggerRef} label={`Plus d’actions pour ${title}`} aria-haspopup="menu" aria-expanded={open} size="m" />
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
        {messageHref && (
          <DropdownMenuItem asChild>
            <a role="menuitem" href={messageHref} className="flex w-full items-center gap-2 text-left" onClick={() => setOpen(false)}>
              <MessageSquarePlus aria-hidden className="h-4 w-4" />Envoyer un message
            </a>
          </DropdownMenuItem>
        )}
        {(onEdit || onDuplicate || messageHref) && onDelete && <DropdownMenuSeparator />}
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
