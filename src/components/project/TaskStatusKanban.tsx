'use client';
import React from 'react';
import { TaskStatusSelect, type TaskStatusDefinition } from './TaskStatusSelect';
export type TaskStatusKanbanTask = { id: string; title: string; statusId: string; canUpdateStatus?: boolean };
export type TaskStatusKanbanProps = { statuses: readonly TaskStatusDefinition[]; tasks: readonly TaskStatusKanbanTask[]; pending?: boolean; onStatusChange?: (taskId: string, statusId: string) => void };
const categories = { todo: 'À faire', inprogress: 'En cours', done: 'Terminé' };
export function TaskStatusKanban({ statuses, tasks, pending, onStatusChange }: TaskStatusKanbanProps) {
  const boardRef = React.useRef<HTMLDivElement>(null);
  const announcementRef = React.useRef<HTMLParagraphElement>(null);
  const focusRequest = React.useRef<{
    taskId: string; statusId: string; source: HTMLSelectElement;
    restoreFocus: boolean; sawPending: boolean;
  } | null>(null);

  React.useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const relinquishFocus = (event: Event) => {
      const request = focusRequest.current;
      if (request && event.target !== request.source && !request.source.contains(event.target as Node)) request.restoreFocus = false;
    };
    const leaveWindow = () => { if (focusRequest.current) focusRequest.current.restoreFocus = false; };
    document.addEventListener('focusin', relinquishFocus);
    document.addEventListener('pointerdown', relinquishFocus);
    window.addEventListener('blur', leaveWindow);
    return () => {
      document.removeEventListener('focusin', relinquishFocus);
      document.removeEventListener('pointerdown', relinquishFocus);
      window.removeEventListener('blur', leaveWindow);
    };
  }, []);

  React.useLayoutEffect(() => {
    const request = focusRequest.current;
    if (!request) return;
    const movedTask = tasks.find(task => task.id === request.taskId);
    if (!movedTask) { focusRequest.current = null; return; }
    if (pending) { request.sawPending = true; return; }
    if (movedTask.statusId !== request.statusId) {
      // A settled write that kept the old snapshot was refused. It must not
      // become a focus target when an unrelated later read moves this task.
      if (request.sawPending) focusRequest.current = null;
      return;
    }
    focusRequest.current = null;
    const card = Array.from(boardRef.current?.querySelectorAll<HTMLElement>('[data-task-id]') ?? [])
      .find(element => element.dataset.taskId === request.taskId);
    const select = card?.querySelector('select');
    const active = document.activeElement;
    if (request.restoreFocus && select && !select.disabled && (active === request.source || active === document.body)) select.focus();
    const status = statuses.find(value => value.id === movedTask.statusId);
    if (status && announcementRef.current) announcementRef.current.textContent = `${movedTask.title} : ${status.name}`;
  }, [tasks, statuses, pending]);

  const changeStatus = (task: TaskStatusKanbanTask, statusId: string) => {
    const source = typeof document === 'undefined' ? null : document.activeElement as HTMLSelectElement | null;
    focusRequest.current = source?.tagName === 'SELECT' && boardRef.current?.contains(source)
      ? { taskId: task.id, statusId, source, restoreFocus: true, sawPending: false }
      : null;
    try { onStatusChange?.(task.id, statusId); }
    catch (reason) { focusRequest.current = null; throw reason; }
  };

  const unknown = tasks.filter(task => !statuses.some(status => status.id === task.statusId));
  return <>
    <div ref={boardRef} className="mairie-task-board grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy={pending}>
      {statuses.map(status => <section key={status.id} aria-label={status.name} className="mairie-status-column min-w-0 rounded-md border p-3" style={{ backgroundColor: 'var(--mairie-surface-raised, #f3f7fc)', color: 'var(--mairie-text, #24292f)', borderColor: 'var(--mairie-border, #dce6f1)' }}>
        <h3 className="flex items-start gap-2 font-semibold [overflow-wrap:anywhere]">
          <span aria-hidden="true" style={{ backgroundColor: /^#[a-f\d]{6}$/i.test(status.color) ? status.color : 'var(--mairie-muted, #536171)' }} className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full" />{status.name}
        </h3>
        <p className="mt-1 text-xs" style={{ color: 'var(--mairie-muted, #536171)' }}>{categories[status.category]} · {tasks.filter(task => task.statusId === status.id).length} tâche(s)</p>
        <div className="mt-3 space-y-3">{tasks.filter(task => task.statusId === status.id).map(task => <article key={task.id} data-task-id={task.id} className="mairie-task-card min-w-0 rounded-md border p-3" style={{ backgroundColor: 'var(--mairie-surface, #fff)', color: 'var(--mairie-text, #24292f)', borderColor: 'var(--mairie-border, #dce6f1)' }}>
          <h4 className="mb-2 font-medium [overflow-wrap:anywhere]">{task.title}</h4>
          <TaskStatusSelect statuses={statuses} value={task.statusId} label={`Statut de ${task.title}`} disabled={pending || !onStatusChange || task.canUpdateStatus !== true} onChange={id => changeStatus(task, id)} />
        </article>)}</div>
      </section>)}
    </div>
    <p ref={announcementRef} role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
    {unknown.length > 0 && <section aria-label="Statuts indisponibles" className="mt-4 rounded-md border p-3" style={{ backgroundColor: 'var(--mairie-surface, #fff)', color: 'var(--mairie-text, #24292f)', borderColor: 'var(--mairie-border, #dce6f1)' }}><h3>Statuts indisponibles</h3>{unknown.map(task => <p key={task.id} className="[overflow-wrap:anywhere]">{task.title}</p>)}</section>}
  </>;
}
