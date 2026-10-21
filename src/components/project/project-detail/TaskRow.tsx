import React from 'react';
import { CalendarDays, CheckSquare2, MessageSquare, Square, Trash2 } from 'lucide-react';

import type { FilterOption } from '../../../lib/projectPageState';
import type { ProjectTask } from '../../../types/project';
import { formatProjectDate, PersonAvatar, PriorityPill, StatusPill } from '../../ProjectCard';
import { TaskEditButton } from '../ProjectFormControls';

export interface TaskRowProps {
  task: ProjectTask;
  linked: boolean;
  articleRef?: React.Ref<HTMLElement>;
  pending: boolean;
  /** Pending, or waiting for a verification read. */
  blocked: boolean;
  mutationPending: boolean;
  toggleDisabled: boolean;
  statusValue: string | undefined;
  statusOptions: FilterOption[];
  writeError?: string;
  deleting: boolean;
  onToggleDone: () => void;
  onStatusChange: (value: string) => void;
  onFollowUp: () => void;
  onEdit: () => void;
  onAskDelete: () => void;
  /** The inline delete confirmation and the follow-up panel. */
  children?: React.ReactNode;
}

const visibleAssignees = (task: ProjectTask) => (task.assignees?.length ? task.assignees : [task.responsible]);

/** One task: done toggle, title, follow-up/edit/delete actions, status, priority, people, due date, labels. */
export const TaskRow = ({
  task, linked, articleRef, pending, blocked, mutationPending, toggleDisabled, statusValue, statusOptions, writeError, deleting,
  onToggleDone, onStatusChange, onFollowUp, onEdit, onAskDelete, children,
}: TaskRowProps) => {
  const TaskIcon = task.completed ? CheckSquare2 : Square;
  const canUpdateStatus = task.permissions?.canUpdateStatus !== false;
  const assignees = visibleAssignees(task);

  return (
    <article
      aria-busy={pending || undefined}
      ref={articleRef as React.Ref<HTMLElement>}
      tabIndex={linked ? -1 : undefined}
      aria-current={linked ? 'true' : undefined}
      data-linked-task={linked ? task.id : undefined}
      className={`grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-3 ${linked ? 'bg-[#ddf4ff] ring-2 ring-inset ring-[#0969da]' : ''}`}
    >
      <button
        type="button"
        disabled={toggleDisabled}
        className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-[#57606a] transition enabled:hover:bg-[#f6f8fa] enabled:hover:text-[#0969da] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da]/30"
        aria-label={task.completed ? `Marquer ${task.title} comme non terminée` : `Marquer ${task.title} comme terminée`}
        onClick={onToggleDone}
      >
        <TaskIcon className={`h-4 w-4 ${task.completed ? 'text-[#1a7f37]' : 'text-[#8c959f]'}`} strokeWidth={1.9} />
      </button>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-col items-start justify-between gap-2 sm:flex-row sm:gap-3">
          <h3 className="w-full min-w-0 text-sm font-semibold leading-snug text-[#24292f] [overflow-wrap:anywhere] sm:flex-1">{task.title}</h3>
          <div className="flex max-w-full flex-wrap items-center gap-1 sm:shrink-0">
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1 rounded-md border border-[#d0d7de] bg-white px-2 text-[11px] font-semibold text-[#57606a] hover:bg-[#f6f8fa]"
              onClick={onFollowUp}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Suivi
            </button>
            {task.permissions?.canEdit !== false && <TaskEditButton disabled={mutationPending || blocked} onClick={onEdit} />}
            {task.permissions?.canDelete !== false && !deleting && (
              <button
                type="button"
                aria-label={`Supprimer ${task.title}`}
                disabled={mutationPending || blocked}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#cf222e] hover:bg-[#ffebe9]"
                onClick={onAskDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#57606a]">
          {canUpdateStatus ? (
            <label className="inline-flex items-center gap-1.5">
              <span className="sr-only">Statut de {task.title}</span>
              <select
                aria-label={`Statut de ${task.title}`}
                disabled={mutationPending || blocked}
                value={statusValue}
                className="h-7 rounded-md border border-[#b7c8db] bg-white px-2 text-xs font-semibold text-[#24292f] outline-none transition hover:border-[#0969da] focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
                onChange={(event) => onStatusChange(event.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <StatusPill status={task.status} />
          )}
          <PriorityPill priority={task.priority} />
          <span className="inline-flex items-center gap-1">
            {assignees.slice(0, 3).map((assignee) => <PersonAvatar key={assignee.name} name={assignee.name} />)}
            {assignees.length > 3 && <span>+{assignees.length - 3}</span>}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.8} />
            {formatProjectDate(task.dueDate)}
          </span>
          {task.labels.map((label) => (
            <span key={label} className="inline-flex h-5 items-center rounded-full border border-[#d0d7de] bg-[#f6f8fa] px-2 text-[11px] font-semibold text-[#57606a]">
              {label}
            </span>
          ))}
        </div>

        {pending && <p role="status" className="mt-2 text-xs text-[#57606a]">Opération sur la tâche en cours…</p>}
        {writeError && <p role="alert" className="mt-2 text-xs text-[#cf222e] [overflow-wrap:anywhere]">{writeError}</p>}
        {children}
      </div>
    </article>
  );
};
