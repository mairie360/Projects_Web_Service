'use client';

import type { TaskStatusDefinition } from '@/lib/projectWorkflow';
import type { TaskFormState } from '@/lib/projectPageState';
import type { Project } from '@/types/project';

const compactFieldClassName =
  'h-8 w-full rounded-md border border-[#d0d7de] bg-white px-2 text-xs text-[#24292f] outline-none transition focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20';

// Status, priority and due date of the task being composed. With project statuses the
// status select carries their ids; otherwise the standard categories.
export function TaskComposerFields({
  statuses,
  statusId,
  status,
  priority,
  dueDate,
  onChange,
}: {
  statuses: TaskStatusDefinition[] | null;
  statusId: string;
  status: Project['status'];
  priority: Project['priority'];
  dueDate: string;
  onChange: (patch: Partial<TaskFormState>) => void;
}) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {statuses ? (
        <select
          aria-label="Statut"
          value={statusId}
          className={compactFieldClassName}
          onChange={(event) => {
            const id = event.target.value;
            const category = statuses.find((item) => item.id === id)?.category;
            onChange({ statusId: id, status: category === 'inprogress' ? 'in-progress' : category ?? 'todo' });
          }}
        >
          <option value="">Choisir un statut du projet</option>
          {statuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      ) : (
        <select aria-label="Statut" value={status} className={compactFieldClassName} onChange={(event) => onChange({ status: event.target.value as Project['status'] })}>
          <option value="todo">À faire</option>
          <option value="in-progress">En cours</option>
          <option value="review">En révision</option>
          <option value="done">Terminé</option>
        </select>
      )}
      <select aria-label="Priorité" value={priority} className={compactFieldClassName} onChange={(event) => onChange({ priority: event.target.value as Project['priority'] })}>
        <option value="high">Haute</option>
        <option value="medium">Moyenne</option>
        <option value="low">Basse</option>
      </select>
      <input aria-label="Échéance" type="date" value={dueDate} className={compactFieldClassName} onChange={(event) => onChange({ dueDate: event.target.value })} />
    </div>
  );
}
