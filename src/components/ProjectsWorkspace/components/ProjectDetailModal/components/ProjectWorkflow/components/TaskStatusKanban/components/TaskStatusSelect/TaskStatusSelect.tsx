'use client';
import React from 'react';

export type TaskStatusDefinition = { id: string; name: string; color: string; category: 'todo' | 'inprogress' | 'done' };
export type TaskStatusSelectProps = { statuses: readonly TaskStatusDefinition[]; value: string; label: string; disabled?: boolean; onChange: (statusId: string) => void };
/** Controlled native selector: keyboard and touch share the same status list. */
export function TaskStatusSelect({ statuses, value, label, disabled, onChange }: TaskStatusSelectProps) {
  const id = React.useId();
  const known = statuses.some(status => status.id === value);
  return <label htmlFor={id} className="block min-w-0 text-sm font-medium" style={{ color: 'var(--mairie-text, #24292f)' }}>
    <span>{label}</span>
    <select id={id} value={value} disabled={disabled || statuses.length === 0 || !known} onChange={event => {
      if (statuses.some(status => status.id === event.target.value)) onChange(event.target.value);
    }} className="mairie-status-select mt-1 min-h-11 w-full max-w-full rounded-md border px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60" style={{ backgroundColor: 'var(--mairie-control-background, #fff)', color: 'var(--mairie-text, #24292f)', borderColor: 'var(--mairie-control-border, #788ba7)', outlineColor: 'var(--mairie-accent, #1256a6)' }}>
      {!known && <option value={value}>Statut indisponible</option>}
      {statuses.map(status => <option key={status.id} value={status.id}>{status.name}</option>)}
    </select>
  </label>;
}
