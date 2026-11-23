'use client';

import React from 'react';
import { Avatar, PriorityPill, StatusPill } from '@mairie360/lib-components/primitives';
import { CalendarDays } from 'lucide-react';

import { formatProjectDate } from '@/components/ProjectsWorkspace/project-card-meta';
import type { ProjectTask } from '@/types/project';
import type { TaskColumnStatus } from '@/components/ProjectsWorkspace/components/ProjectPage/use-detail-task-form';
import { taskAssignees } from '@/components/ProjectsWorkspace/components/ProjectPage/use-task-filters';
import { TaskActionsMenu, type TaskMenuColumn } from '../../../TaskActionsMenu';

export interface TaskCardProps {
  task: ProjectTask;
  column: TaskColumnStatus;
  columns: readonly TaskMenuColumn[];
  overdue: boolean;
  /** Archived by the BFF once done (MAIR-559): shown for the record, without actions. */
  archived?: boolean;
  pending?: boolean;
  /** No write may start on it (pending, waiting for a verification read, another write running). */
  blocked?: boolean;
  writeError?: string;
  linked?: boolean;
  articleRef?: React.Ref<HTMLElement>;
  onOpen: () => void;
  /** « Modifier la tâche » of the « … » (MAIR-1137); absent without the right to edit it. */
  onEdit?: () => void;
  onMove?: (status: TaskColumnStatus) => void;
  onDelete?: () => void;
}

/** A task of the board (MAIR-859, Figma F6 6.2): title, « … », priority, « En retard », assignee and due date; struck through once done. */
export function TaskCard({ task, column, columns, overdue, archived = false, pending = false, blocked = false, writeError, linked = false, articleRef, onOpen, onEdit, onMove, onDelete }: TaskCardProps) {
  const done = column === 'done';
  const assignee = taskAssignees(task)[0];

  return (
    <article
      ref={articleRef as React.Ref<HTMLElement>}
      data-task-id={task.id}
      data-linked-task={linked ? task.id : undefined}
      aria-current={linked ? 'true' : undefined}
      tabIndex={linked ? -1 : undefined}
      aria-busy={pending || undefined}
      className={`min-w-0 rounded-lg border border-[var(--mairie-border)] bg-[var(--mairie-surface)] p-3 shadow-sm ${linked ? 'ring-2 ring-[var(--mairie-accent)]' : ''}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        {archived ? (
          <h4 className="min-w-0 text-sm font-semibold text-[var(--mairie-muted)] line-through [overflow-wrap:anywhere]">{task.title}</h4>
        ) : (
          <h4 className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere]">
            <button
              type="button"
              aria-label={`Ouvrir la tâche ${task.title}`}
              className={`text-left hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mairie-accent)] ${done ? 'text-[var(--mairie-muted)] line-through' : 'text-[var(--mairie-text)]'}`}
              onClick={onOpen}
            >
              {task.title}
            </button>
          </h4>
        )}
        {!archived && <TaskActionsMenu title={task.title} column={column} columns={columns} disabled={blocked} onOpen={onOpen} onEdit={onEdit} onMove={onMove} onDelete={onDelete} />}
      </div>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
        <PriorityPill level={task.priority} size="s" />
        {overdue && <StatusPill label="En retard" tone="danger" dot size="s" />}
        {assignee && <span className="ml-auto" title={assignee.name}><Avatar alt={assignee.name} size="xs" /></span>}
      </div>
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--mairie-muted)]">
        <CalendarDays aria-hidden className="h-3.5 w-3.5" strokeWidth={1.8} />
        <span className="sr-only">Échéance :</span>
        {formatProjectDate(task.dueDate)}
      </p>
      {pending && <p role="status" className="mt-2 text-xs text-[var(--mairie-muted)]">Enregistrement…</p>}
      {writeError && <p role="alert" className="mt-2 text-xs text-[var(--mairie-error-text)] [overflow-wrap:anywhere]">{writeError}</p>}
    </article>
  );
}
