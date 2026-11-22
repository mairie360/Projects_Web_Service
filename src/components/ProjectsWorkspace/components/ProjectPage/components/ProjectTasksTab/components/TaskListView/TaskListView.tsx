'use client';

import React from 'react';
import { Checkbox, DataTable, PriorityPill, StatusBadge, StatusPill, UserIdentity } from '@mairie360/lib-components/primitives';
import type { DataTableColumn } from '@mairie360/lib-components/primitives';
import { CalendarDays } from 'lucide-react';

import { formatProjectDate, projectStatusBadge } from '@/components/ProjectsWorkspace/project-card-meta';
import type { TaskColumnStatus } from '@/components/ProjectsWorkspace/components/ProjectPage/use-detail-task-form';
import { taskAssignees } from '@/components/ProjectsWorkspace/components/ProjectPage/use-task-filters';
import type { ProjectTask } from '@/types/project';

export type TaskListItem = { task: ProjectTask; column: TaskColumnStatus; archived: boolean; moving: boolean };

/** The status shown for a task: the one it is moving to while the write runs. */
const shownStatus = ({ task, column, moving }: TaskListItem): ProjectTask['status'] => (moving ? column : task.status);

/**
 * MAIR-859 (C6, Figma F6 6.12): the tasks as a lib DataTable — done checkbox, task, state, priority, assignee, due date.
 * The checkbox completes or reopens the task through the same write as the board; the title opens the sheet.
 */
export function TaskListView({ items, isOverdue, canMove, onOpenTask, onMoveTask, emptyTitle }: {
  items: readonly TaskListItem[];
  isOverdue: (task: ProjectTask) => boolean;
  canMove: (task: ProjectTask) => boolean;
  onOpenTask: (task: ProjectTask) => void;
  onMoveTask: (task: ProjectTask, status: TaskColumnStatus) => void;
  emptyTitle: string;
}) {
  const columns: DataTableColumn<TaskListItem>[] = [
    {
      key: 'done',
      header: 'Terminée',
      hideHeader: true,
      kind: 'content',
      width: '48px',
      cell: (item) => {
        const done = item.column === 'done';
        return (
          <div onClick={(event) => event.stopPropagation()}>
            <Checkbox
              size="s"
              label={<span className="sr-only">{done ? `Marquer ${item.task.title} comme non terminée` : `Marquer ${item.task.title} comme terminée`}</span>}
              checked={done}
              disabled={item.archived || !canMove(item.task)}
              onChange={() => onMoveTask(item.task, done ? 'todo' : 'done')}
            />
          </div>
        );
      },
    },
    {
      key: 'title',
      header: 'Tâche',
      kind: 'content',
      cell: (item) => item.archived
        ? <span className="font-semibold text-[var(--mairie-muted)] line-through">{item.task.title}</span>
        : (
          <button
            type="button"
            aria-label={`Ouvrir la tâche ${item.task.title}`}
            className={`text-left font-semibold [overflow-wrap:anywhere] hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mairie-accent)] ${item.column === 'done' ? 'text-[var(--mairie-muted)] line-through' : 'text-[var(--mairie-text)]'}`}
            onClick={(event) => { event.stopPropagation(); onOpenTask(item.task); }}
          >
            {item.task.title}
          </button>
        ),
    },
    { key: 'status', header: 'État', kind: 'content', cell: (item) => <StatusBadge status={projectStatusBadge[shownStatus(item)]} /> },
    { key: 'priority', header: 'Priorité', kind: 'content', cell: (item) => <PriorityPill level={item.task.priority} /> },
    {
      key: 'assignee',
      header: 'Assignée à',
      kind: 'content',
      cell: (item) => {
        const assignee = taskAssignees(item.task)[0];
        return assignee ? <UserIdentity name={assignee.name} variant="nameOnly" size="s" /> : <span className="text-[var(--mairie-muted)]">Non assignée</span>;
      },
    },
    {
      key: 'dueDate',
      header: 'Échéance',
      kind: 'content',
      cell: (item) => (
        <span className="inline-flex flex-wrap items-center gap-1.5 text-sm">
          <CalendarDays aria-hidden className="h-4 w-4 shrink-0 text-[var(--mairie-muted)]" strokeWidth={1.8} />
          {formatProjectDate(item.task.dueDate)}
          {isOverdue(item.task) && <StatusPill label="En retard" tone="danger" dot size="s" />}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      label="Tâches du projet"
      columns={columns}
      rows={[...items]}
      rowKey={(item) => item.task.id}
      className="min-w-[760px]"
      stateProps={{ title: emptyTitle }}
      rowProps={(item) => ({
        className: item.archived ? undefined : 'cursor-pointer',
        'data-task-id': item.task.id,
        'aria-busy': item.moving || undefined,
        onClick: () => { if (!item.archived) onOpenTask(item.task); },
      } as React.HTMLAttributes<HTMLTableRowElement>)}
    />
  );
}
