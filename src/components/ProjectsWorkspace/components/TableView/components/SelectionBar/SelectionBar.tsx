'use client';

import { Button } from '@mairie360/lib-components/primitives';
import { Trash2 } from 'lucide-react';

/**
 * Bar above the table while projects are selected (MAIR-833, Figma F1 1.3): the count is a polite live status,
 * « Désélectionner » clears the selection and « Supprimer » asks for the bulk deletion.
 */
export function SelectionBar({ count, onClear, onDelete }: { count: number; onClear: () => void; onDelete: () => void }) {
  if (count === 0) return null;
  const label = `${count} projet${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;
  return (
    <div
      role="region"
      aria-label="Sélection de projets"
      className="mb-3 flex flex-wrap items-center gap-3 rounded-[var(--mairie-radius-m)] border border-[var(--mairie-accent)] bg-[var(--mairie-accent-surface)] px-4 py-2"
    >
      <p role="status" aria-live="polite" className="mr-auto text-sm font-semibold text-[var(--mairie-text)]">{label}</p>
      <Button variant="ghost" size="s" onClick={onClear}>Désélectionner</Button>
      <Button variant="solid" tone="danger" size="s" icon={Trash2} onClick={onDelete}>Supprimer</Button>
    </div>
  );
}
