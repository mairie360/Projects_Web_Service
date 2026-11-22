'use client';

import React from 'react';
import { KanbanColumn } from '@mairie360/lib-components/primitives';

import type { ProjectTask } from '@/types/project';
import type { TaskColumnStatus } from '@/components/ProjectsWorkspace/components/ProjectPage/use-detail-task-form';
import { projectColumnTone } from '@/components/ProjectsWorkspace/project-card-meta';
import { COLLAPSED_TASK_COLUMNS_KEY, useCollapsedColumns } from '@/components/ProjectsWorkspace/use-collapsed-columns';
import { QuickAddTask } from './components/QuickAddTask';
import { TaskCard } from './components/TaskCard';

const DRAG_TYPE = 'application/x-mairie360-task';

export type TaskBoardColumn = { status: TaskColumnStatus; label: string; disabled?: boolean };
export type TaskBoardItem = { task: ProjectTask; column: TaskColumnStatus; archived: boolean; moving: boolean };

export interface TaskBoardProps {
  columns: readonly TaskBoardColumn[];
  items: readonly TaskBoardItem[];
  /** « + 2 tâches terminées » under « Terminé »: archived done tasks, counted but not listed. */
  archivedLabel?: string;
  isOverdue: (task: ProjectTask) => boolean;
  /** A task whose status may change now (permission, no pending write, no verification waiting). */
  canMove: (task: ProjectTask) => boolean;
  canDelete: (task: ProjectTask) => boolean;
  blocked: (task: ProjectTask) => boolean;
  pendingTaskIds?: ReadonlySet<string>;
  taskWriteErrors?: ReadonlyMap<string, string>;
  highlightTaskId?: string | null;
  highlightedTaskRef?: React.Ref<HTMLElement>;
  quickAddPending?: boolean;
  onOpenTask: (task: ProjectTask) => void;
  onMoveTask: (task: ProjectTask, status: TaskColumnStatus) => void;
  onDeleteTask: (task: ProjectTask) => void;
  /** C3: the « + » of a column; absent without the right to create a task. Resolves `true` once the field may close. */
  onQuickAdd?: (title: string, status: TaskColumnStatus) => Promise<boolean>;
}

/**
 * MAIR-859 (C1, C2, Figma F6 6.2–6.5): the task board, three columns (À faire, En cours, Terminé). A card is dragged to
 * another column; its « … » menu offers the same move for the keyboard and touch. Formerly `TaskStatusKanban`, which
 * showed one column per project status with a status select per card.
 */
export function TaskBoard({
  columns, items, archivedLabel, isOverdue, canMove, canDelete, blocked, pendingTaskIds, taskWriteErrors, highlightTaskId, highlightedTaskRef,
  quickAddPending = false, onOpenTask, onMoveTask, onDeleteTask, onQuickAdd,
}: TaskBoardProps) {
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [target, setTarget] = React.useState<TaskColumnStatus | null>(null);
  const [adding, setAdding] = React.useState<TaskColumnStatus | null>(null);
  const startedOnControl = React.useRef(false);
  const instructionsId = React.useId();
  // MAIR-1134: a column folds from its header chevron (« Terminé » too); remembered per browser. A folded column still takes a drop.
  const { collapsed, setColumnCollapsed } = useCollapsedColumns(COLLAPSED_TASK_COLUMNS_KEY);
  const dragged = items.find((item) => item.task.id === draggedId);
  const accepts = (status: TaskColumnStatus) => Boolean(dragged && !dragged.archived && canMove(dragged.task) && dragged.column !== status
    && !columns.find((column) => column.status === status)?.disabled);

  const endDrag = () => {
    setDraggedId(null);
    setTarget(null);
  };

  const drop = (event: React.DragEvent, status: TaskColumnStatus) => {
    event.preventDefault();
    if (!dragged || !accepts(status) || event.dataTransfer.getData(DRAG_TYPE) !== dragged.task.id) return;
    const { task } = dragged;
    endDrag();
    onMoveTask(task, status);
  };

  const closeQuickAdd = () => {
    const column = adding;
    setAdding(null);
    if (column) queueMicrotask(() => document.querySelector<HTMLButtonElement>(`[data-task-column="${column}"] header button[aria-label^="Ajouter dans"]`)?.focus());
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
      <p id={instructionsId} className="sr-only">
        Glissez une tâche vers une autre colonne pour changer son état. Au clavier ou sur mobile, utilisez « Déplacer vers » dans le menu Actions de la tâche.
      </p>
      {columns.map((column) => {
        const columnItems = items.filter((item) => item.column === column.status);
        return (
          <KanbanColumn
            key={column.status}
            title={column.label}
            tone={projectColumnTone[column.status]}
            count={columnItems.length}
            onAdd={onQuickAdd && !quickAddPending && !column.disabled ? () => {
              setColumnCollapsed(column.status, false);
              setAdding(column.status);
            } : undefined}
            collapsible
            collapsed={collapsed.has(column.status) && adding !== column.status}
            onCollapsedChange={(folded) => setColumnCollapsed(column.status, folded)}
            dropActive={target === column.status}
            emptyLabel="Aucune tâche"
            footer={column.status === 'done' && archivedLabel ? <p className="text-center text-sm text-[var(--mairie-muted)]">{archivedLabel}</p> : undefined}
            data-task-column={column.status}
            onDragOver={(event) => {
              if (!accepts(column.status)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setTarget(column.status);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTarget((current) => current === column.status ? null : current);
            }}
            onDrop={(event) => drop(event, column.status)}
          >
              {adding === column.status && onQuickAdd && (
                <QuickAddTask
                  columnLabel={column.label}
                  pending={quickAddPending}
                  onCancel={closeQuickAdd}
                  onSubmit={async (title) => {
                    if (await onQuickAdd(title, column.status)) setAdding(null);
                  }}
                />
              )}
              {columnItems.map(({ task, column: status, archived, moving }) => {
                const movable = !archived && canMove(task);
                const linked = highlightTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    role="group"
                    aria-label={task.title}
                    aria-describedby={instructionsId}
                    draggable={movable}
                    className={draggedId === task.id ? 'opacity-40' : undefined}
                    onPointerDownCapture={(event) => {
                      startedOnControl.current = Boolean((event.target as Element).closest('button, a, input, textarea, select'));
                    }}
                    onDragStart={(event) => {
                      if (!movable || startedOnControl.current) {
                        event.preventDefault();
                        return;
                      }
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData(DRAG_TYPE, task.id);
                      setDraggedId(task.id);
                    }}
                    onDragEnd={endDrag}
                  >
                    <TaskCard
                      task={task}
                      column={status}
                      columns={columns}
                      overdue={isOverdue(task)}
                      archived={archived}
                      pending={moving || (pendingTaskIds?.has(task.id) ?? false)}
                      blocked={blocked(task)}
                      writeError={taskWriteErrors?.get(task.id)}
                      linked={linked}
                      articleRef={linked ? highlightedTaskRef : undefined}
                      onOpen={() => onOpenTask(task)}
                      onMove={movable ? (next) => onMoveTask(task, next) : undefined}
                      onDelete={canDelete(task) ? () => onDeleteTask(task) : undefined}
                    />
                  </div>
                );
              })}
          </KanbanColumn>
        );
      })}
    </div>
  );
}
