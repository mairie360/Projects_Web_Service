'use client';

import React from 'react';
import { TextField } from '@mairie360/lib-components/primitives';

import { NO_MARKUP_HINT, NO_MARKUP_PATTERN } from '@/lib/text-constraints';
import { TASK_TITLE_REQUIRED } from '@/components/ProjectsWorkspace/components/ProjectPage/use-detail-task-form';

/**
 * MAIR-859 (C3, Figma F6 6.5): inline title field opened by the « + » of a column. Entrée adds the task, Échap cancels;
 * the field stays with its text while the write runs or when it is refused.
 */
export function QuickAddTask({ columnLabel, pending = false, onSubmit, onCancel }: {
  columnLabel: string;
  pending?: boolean;
  onSubmit: (title: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState('');
  const [error, setError] = React.useState('');
  const id = React.useId();
  return (
    <div className="rounded-lg border border-[var(--mairie-accent)] bg-[var(--mairie-surface)] p-2">
      <TextField
        id={`quick-add-${id}`}
        label={<span className="sr-only">{`Titre de la nouvelle tâche dans ${columnLabel}`}</span>}
        value={title}
        placeholder="Titre de la tâche"
        autoFocus
        disabled={pending}
        pattern={NO_MARKUP_PATTERN}
        title={NO_MARKUP_HINT}
        error={error}
        hint="Entrée pour ajouter, Échap pour annuler"
        onChange={(event) => { setTitle(event.target.value); if (event.target.value.trim()) setError(''); }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
          } else if (event.key === 'Enter') {
            event.preventDefault();
            if (pending) return;
            if (!title.trim()) setError(TASK_TITLE_REQUIRED);
            else void onSubmit(title.trim());
          }
        }}
      />
    </div>
  );
}
