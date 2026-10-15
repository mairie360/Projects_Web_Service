'use client';
import React from 'react';
import { TaskStatusSelect, type TaskStatusDefinition } from './TaskStatusSelect';
export type TaskStatusKanbanTask = { id: string; title: string; statusId: string; canUpdateStatus?: boolean };
export type TaskStatusKanbanProps = { statuses: readonly TaskStatusDefinition[]; tasks: readonly TaskStatusKanbanTask[]; pending?: boolean; onStatusChange?: (taskId: string, statusId: string) => void };
const categories = { todo: 'À faire', inprogress: 'En cours', done: 'Terminé' };
export function TaskStatusKanban({ statuses, tasks, pending, onStatusChange }: TaskStatusKanbanProps) {
  const unknown = tasks.filter(task => !statuses.some(status => status.id === task.statusId));
  return <>
    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy={pending}>
      {statuses.map(status => <section key={status.id} aria-label={status.name} className="min-w-0 rounded-md border border-[#d9d5d0] bg-[#fbfaf8] p-3">
        <h3 className="flex items-start gap-2 font-semibold text-[#24292f] [overflow-wrap:anywhere]">
          <span aria-hidden="true" style={{ backgroundColor: /^#[a-f\d]{6}$/i.test(status.color) ? status.color : '#536171' }} className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full" />{status.name}
        </h3>
        <p className="mt-1 text-xs text-[#536171]">{categories[status.category]} · {tasks.filter(task => task.statusId === status.id).length} tâche(s)</p>
        <div className="mt-3 space-y-3">{tasks.filter(task => task.statusId === status.id).map(task => <article key={task.id} className="min-w-0 rounded-md border border-[#d0d7de] bg-white p-3">
          <h4 className="mb-2 font-medium text-[#24292f] [overflow-wrap:anywhere]">{task.title}</h4>
          <TaskStatusSelect statuses={statuses} value={task.statusId} label={`Statut de ${task.title}`} disabled={pending || !onStatusChange || task.canUpdateStatus !== true} onChange={id => onStatusChange?.(task.id, id)} />
        </article>)}</div>
      </section>)}
    </div>
    {unknown.length > 0 && <section aria-label="Statuts indisponibles" className="mt-4 rounded-md border border-[#d0d7de] p-3"><h3>Statuts indisponibles</h3>{unknown.map(task => <p key={task.id} className="[overflow-wrap:anywhere]">{task.title}</p>)}</section>}
  </>;
}
