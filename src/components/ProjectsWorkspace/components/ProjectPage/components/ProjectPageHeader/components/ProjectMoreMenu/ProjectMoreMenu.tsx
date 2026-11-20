import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, MoreIconButton, ToolTip } from '@mairie360/lib-components/primitives';
import { Copy, Trash2 } from 'lucide-react';

export interface ProjectMoreMenuProps {
  title: string;
  onDuplicate?: () => void;
  duplicateDisabled?: boolean;
  duplicateLabel?: string;
  onDelete?: () => void;
}

/** MAIR-846 (Figma F5 5.8): « Plus d’actions » of the project page — Dupliquer, Supprimer. */
export const ProjectMoreMenu = ({ title, onDuplicate, duplicateDisabled = false, duplicateLabel = 'Dupliquer', onDelete }: ProjectMoreMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  if (!onDuplicate && !onDelete) return null;
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
        {onDuplicate && (
          <DropdownMenuItem asChild disabled={duplicateDisabled}>
            <button type="button" role="menuitem" disabled={duplicateDisabled} className="flex w-full items-center gap-2 text-left" onClick={run(onDuplicate)}>
              <Copy aria-hidden className="h-4 w-4" />{duplicateLabel}
            </button>
          </DropdownMenuItem>
        )}
        {onDuplicate && onDelete && <DropdownMenuSeparator />}
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
