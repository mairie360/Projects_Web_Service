'use client';
import React from 'react';

export type TaskStatusDefinition = { id: string; name: string; color: string; category: 'todo' | 'inprogress' | 'done' };
export type TaskStatusSelectProps = { statuses: readonly TaskStatusDefinition[]; value: string; label: string; disabled?: boolean; onChange: (statusId: string) => void };
/** Controlled native selector: keyboard and touch share the same status list. */
export function TaskStatusSelect({ statuses, value, label, disabled, onChange }: TaskStatusSelectProps) {
  const id = React.useId();
  const known = statuses.some(status => status.id === value);
  return <label htmlFor={id} className="block min-w-0 text-sm font-medium text-[#24292f]">
    <span>{label}</span>
    <select id={id} value={value} disabled={disabled || statuses.length === 0 || !known} onChange={event => {
      if (statuses.some(status => status.id === event.target.value)) onChange(event.target.value);
    }} className="mt-1 min-h-11 w-full max-w-full rounded-md border border-[#d0d7de] bg-white px-3 py-2 text-[#24292f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1256a6] disabled:opacity-60">
      {!known && <option value={value}>Statut indisponible</option>}
      {statuses.map(status => <option key={status.id} value={status.id}>{status.name}</option>)}
    </select>
  </label>;
}
