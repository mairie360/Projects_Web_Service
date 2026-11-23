'use client';

import React from 'react';
import { Checkbox, DataTable, PriorityPill, StatusBadge, StatusPill, UserIdentity } from '@mairie360/lib-components/primitives';
import type { DataTableColumn } from '@mairie360/lib-components/primitives';
import { CalendarDays } from 'lucide-react';

import { formatProjectDate, projectStatusBadge } from '@/components/ProjectsWorkspace/project-card-meta';
import { priorityRank, sortableDate, sortRows, statusRank, type SortValue, type TableSort } from '@/components/ProjectsWorkspace/table-sort';
import type { TaskColumnStatus } from '@/components/ProjectsWorkspace/components/ProjectPage/use-detail-task-form';
import { taskAssignees } from '@/components/ProjectsWorkspace/components/ProjectPage/use-task-filters';
import type { ProjectTask } from '@/types/project';
import { TaskActionsMenu, type TaskMenuColumn } from '../TaskActionsMenu';

export type TaskListItem = { task: ProjectTask; column: TaskColumnStatus; archived: boolean; moving: boolean };

/** The status shown for a task: the one it is moving to while the write runs. */
const shownStatus = ({ task, column, moving }: TaskListItem): ProjectTask['status'] => (moving ? column : task.status);

type TaskSortKey = 'title' | 'status' | 'priority' | 'assignee' | 'dueDate';

/** MAIR-1138: what each sortable column compares; « État » and « Priorité » follow the business orders. */
const taskSortValue: Record<TaskSortKey, (item: TaskListItem) => SortValue> = {
  title: (item) => item.task.title,
  status: (item) => statusRank(shownStatus(item)),
  priority: (item) => priorityRank(item.task.priority),
  assignee: (item) => taskAssignees(item.task)[0]?.name ?? '',
  dueDate: (item) => sortableDate(item.task.dueDate),
};

/** The list order: by default the due date, the closest first, tasks without one last (MAIR-1138). */
export const DEFAULT_TASK_SORT: TableSort<TaskSortKey> = { key: 'dueDate', direction: 'asc' };

export function sortTaskItems(items: readonly TaskListItem[], sort: TableSort<TaskSortKey> = DEFAULT_TASK_SORT) {
  return sortRows(items, sort, taskSortValue);
}

/**
 * MAIR-859 (C6, Figma F6 6.12): the tasks as a lib DataTable — done checkbox, task, state, priority, assignee, due date.
 * The checkbox completes or reopens the task through the same write as the board; the title opens the sheet.
 * MAIR-1138: Tâche, État, Priorité, Assignée à and Échéance sort by their header, by due date first.
 * MAIR-1137 (C15): a row opens the task page; its « … » offers Ouvrir, Modifier, Changer l’état and Supprimer.
 */
export function TaskListView({ items, isOverdue, canMove, onOpenTask, onMoveTask, emptyTitle, menuColumns = [], blocked, onEditTask, onDeleteTask }: {
  items: readonly TaskListItem[];
  isOverdue: (task: ProjectTask) => boolean;
  canMove: (task: ProjectTask) => boolean;
  onOpenTask: (task: ProjectTask) => void;
  onMoveTask: (task: ProjectTask, status: TaskColumnStatus) => void;
  emptyTitle: string;
  /** States offered by the « … » of a row (MAIR-1137). */
  menuColumns?: readonly TaskMenuColumn[];
  blocked?: (task: ProjectTask) => boolean;
  onEditTask?: (task: ProjectTask) => void;
  /** Absent for a task the caller may not delete. */
  onDeleteTask?: (task: ProjectTask) => (() => void) | undefined;
}) {
  const [sort, setSort] = React.useState<TableSort<TaskSortKey>>(DEFAULT_TASK_SORT);
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
      sortable: true,
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
    { key: 'status', header: 'État', kind: 'content', sortable: true, cell: (item) => <StatusBadge status={projectStatusBadge[shownStatus(item)]} /> },
    { key: 'priority', header: 'Priorité', kind: 'content', sortable: true, cell: (item) => <PriorityPill level={item.task.priority} /> },
    {
      key: 'assignee',
      header: 'Assignée à',
      kind: 'content',
      sortable: true,
      cell: (item) => {
        const assignee = taskAssignees(item.task)[0];
        return assignee ? <UserIdentity name={assignee.name} variant="nameOnly" size="s" /> : <span className="text-[var(--mairie-muted)]">Non assignée</span>;
      },
    },
    {
      key: 'dueDate',
      header: 'Échéance',
      kind: 'content',
      sortable: true,
      cell: (item) => (
        <span className="inline-flex flex-wrap items-center gap-1.5 text-sm">
          <CalendarDays aria-hidden className="h-4 w-4 shrink-0 text-[var(--mairie-muted)]" strokeWidth={1.8} />
          {formatProjectDate(item.task.dueDate)}
          {isOverdue(item.task) && <StatusPill label="En retard" tone="danger" dot size="s" />}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      hideHeader: true,
      kind: 'content',
      width: '56px',
      cell: (item) => item.archived ? null : (
        <TaskActionsMenu
          title={item.task.title}
          column={item.column}
          columns={menuColumns}
          disabled={blocked?.(item.task)}
          onOpen={() => onOpenTask(item.task)}
          onEdit={onEditTask && item.task.permissions?.canEdit !== false ? () => onEditTask(item.task) : undefined}
          onMove={canMove(item.task) ? (status) => onMoveTask(item.task, status) : undefined}
          onDelete={onDeleteTask?.(item.task)}
        />
      ),
    },
  ];

  return (
    <DataTable
      label="Tâches du projet"
      columns={columns}
      rows={sortTaskItems(items, sort)}
      // MAIR-1138: the lib header buttons sort (1st click ascending, 2nd descending) and set `aria-sort`.
      sort={sort}
      onSort={(key, direction) => setSort({ key: key as TaskSortKey, direction })}
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
