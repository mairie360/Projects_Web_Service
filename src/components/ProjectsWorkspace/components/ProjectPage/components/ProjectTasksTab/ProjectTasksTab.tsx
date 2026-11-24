'use client';

import React from 'react';
import type { FilterOption } from '@/lib/projectPageState';
import type { Project, ProjectTask } from '@/types/project';
import type { TaskColumnStatus, useDetailTaskForm } from '../../use-detail-task-form';
import type { TaskCollaborationState } from '../../use-task-collaboration';
import type { TaskFiltersState } from '../../use-task-filters';
import { TaskBoard } from './components/TaskBoard';
import { TaskDeleteConfirm } from './components/TaskDeleteConfirm';
import { TaskListView } from './components/TaskListView';
import { TaskDialog } from './components/TaskDialog';
import { TaskPage } from './components/TaskPage';
import { TaskFiltersEmptyState } from './components/TaskFiltersEmptyState';
import { TaskToolbar, type TaskView } from './components/TaskToolbar';
import {
  archivedTasksMore, assigneeLoads, isTaskOverdue, TASK_COLUMNS, TASK_DUE_OPTIONS, TASK_STATUS_OPTIONS, type TaskDueFilter,
} from './task-board-model';
import { useTaskBoard } from './use-task-board';

type TaskForm = Omit<ReturnType<typeof useDetailTaskForm>, 'noticeRef'>;

export interface ProjectTasksTabProps {
  project: Project;
  tasks: ProjectTask[];
  filters: TaskFiltersState;
  taskForm: TaskForm;
  collaboration: TaskCollaborationState;
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  /** Columns the project has no status for (its own statuses, MAIR-567): no move nor creation there. */
  unavailableColumns?: ReadonlySet<TaskColumnStatus>;
  pendingTaskIds?: ReadonlySet<string>;
  unverifiedTaskIds?: ReadonlySet<string>;
  taskWriteErrors?: ReadonlyMap<string, string>;
  mutationPending: boolean;
  highlightTaskId?: string | null;
  highlightedTaskRef?: React.Ref<HTMLElement>;
  /** Resolves `true` once the BFF confirmed the new status (the controller shows the toast either way). */
  onMoveTask: (task: ProjectTask, status: TaskColumnStatus) => Promise<boolean>;
  onDeleteTask: (projectId: string, taskId: string, taskTitle: string) => Promise<unknown>;
  /** Task creation notice (receipt to verify), shown in the creation window. */
  creationNotice?: React.ReactNode;
  /** MAIR-1137 (C15): the task whose page is shown in place of the board, or `null`. */
  viewedTaskId?: string | null;
  onViewTask?: (taskId: string | null) => void;
}

/**
 * MAIR-859 (Figma F6): the « Tâches » tab — toolbar (search, assignee, priority, status and due-date filters, Tableau / Liste), the
 * three-column board or the list, the task window and the deletion confirmation. MAIR-1137: a click on a task opens its
 * page (`TaskPage`) in place of the board; « Modifier » opens the window (`TaskDialog`, which replaced the Drawer
 * sheet). Writes go through the page controller (task create / patch / status / delete operations of BFF_Project).
 */
export function ProjectTasksTab({
  project, tasks, filters, taskForm, collaboration, statusOptions, priorityOptions, memberOptions, labelOptions, unavailableColumns,
  pendingTaskIds, unverifiedTaskIds, taskWriteErrors, mutationPending, highlightTaskId, highlightedTaskRef, onMoveTask, onDeleteTask, creationNotice,
  viewedTaskId = null, onViewTask,
}: ProjectTasksTabProps) {
  const [view, setView] = React.useState<TaskView>('board');
  const [deleting, setDeleting] = React.useState<ProjectTask | null>(null);
  const [quickAddPending, setQuickAddPending] = React.useState(false);
  const board = useTaskBoard({ tasks, onMoveTask });
  const canCreate = project.permissions?.canCreateTask !== false;
  const blocked = (task: ProjectTask) => mutationPending || (pendingTaskIds?.has(task.id) ?? false) || (unverifiedTaskIds?.has(task.id) ?? false);
  const canMove = (task: ProjectTask) => task.permissions?.canUpdateStatus !== false && !blocked(task);
  const canDelete = (task: ProjectTask) => task.permissions?.canDelete !== false;
  const columns = TASK_COLUMNS.map((column) => ({ ...column, disabled: unavailableColumns?.has(column.status) }));
  const items = board.boardTasks.filter((item) => filters.matches(item.task, item.column));
  const editedTask = taskForm.editingTaskId ? tasks.find((task) => task.id === taskForm.editingTaskId) ?? null : null;
  const move = (task: ProjectTask, status: TaskColumnStatus) => {
    if (canMove(task) && !unavailableColumns?.has(status)) void board.move(task, status);
  };
  const askDelete = (task: ProjectTask) => {
    if (!blocked(task)) setDeleting(task);
  };
  const canEdit = (task: ProjectTask) => task.permissions?.canEdit !== false;
  // MAIR-1137 (C15): opening a task shows its page; the edit is « Modifier » only.
  const openTask = (task: ProjectTask) => onViewTask ? onViewTask(task.id) : taskForm.edit(task);
  const viewed = viewedTaskId ? board.boardTasks.find((item) => item.task.id === viewedTaskId) ?? null : null;
  const loads = React.useMemo(() => assigneeLoads(tasks), [tasks]);

  return (
    <div className="min-w-0">
      {viewed ? (
        <TaskPage
          task={viewed.task}
          project={project}
          column={viewed.column}
          columns={columns}
          overdue={isTaskOverdue(viewed.task)}
          blocked={blocked(viewed.task) || viewed.archived}
          collaboration={collaboration}
          onBack={() => onViewTask?.(null)}
          onEdit={canEdit(viewed.task) && !viewed.archived ? () => taskForm.edit(viewed.task) : undefined}
          onMove={canMove(viewed.task) && !viewed.archived ? (status) => move(viewed.task, status) : undefined}
          onDuplicate={canCreate && !viewed.archived ? () => void taskForm.duplicate(viewed.task) : undefined}
          onDelete={canDelete(viewed.task) && !viewed.archived ? () => askDelete(viewed.task) : undefined}
        />
      ) : (
      <>
      <TaskToolbar
        search={filters.search}
        assignee={filters.assignee}
        priority={filters.priority}
        assigneeOptions={filters.assigneeOptions}
        priorityOptions={priorityOptions}
        status={filters.status}
        due={filters.due}
        statusOptions={TASK_STATUS_OPTIONS}
        dueOptions={TASK_DUE_OPTIONS}
        active={filters.active}
        view={view}
        onSearchChange={filters.setSearch}
        onAssigneeChange={filters.setAssignee}
        onPriorityChange={filters.setPriority}
        onStatusChange={filters.setStatus}
        onDueChange={(value) => filters.setDue(value as TaskDueFilter)}
        onReset={filters.reset}
        onViewChange={setView}
      />

      {pendingTaskIds && [...pendingTaskIds].some((id) => !tasks.some((task) => task.id === id)) && (
        <p role="status" className="mb-3 text-sm text-[var(--mairie-muted)]">Actualisation des tâches en cours…</p>
      )}

      {/* MAIR-1134 (C8): the view fades and rises in when it changes (260 ms, none under prefers-reduced-motion). */}
      <div key={view} className="m360-view-enter">
      {filters.active && items.length === 0 ? (
        <TaskFiltersEmptyState onReset={filters.reset} />
      ) : view === 'board' ? (
        <TaskBoard
          columns={columns}
          items={items}
          archivedLabel={archivedTasksMore(Math.max(0, project.tasks.archived - board.keptArchived))}
          isOverdue={(task) => isTaskOverdue(task)}
          canMove={canMove}
          canDelete={canDelete}
          blocked={blocked}
          pendingTaskIds={pendingTaskIds}
          taskWriteErrors={taskWriteErrors}
          highlightTaskId={highlightTaskId}
          highlightedTaskRef={highlightedTaskRef}
          quickAddPending={quickAddPending || mutationPending}
          onOpenTask={openTask}
          onEditTask={taskForm.edit}
          onMoveTask={move}
          onDeleteTask={askDelete}
          onQuickAdd={canCreate ? async (title, status) => {
            setQuickAddPending(true);
            try {
              return (await taskForm.quickAdd(title, status)) !== 'refused';
            } finally {
              setQuickAddPending(false);
            }
          } : undefined}
        />
      ) : (
        <div className="overflow-x-auto">
          <TaskListView
            items={items}
            isOverdue={(task) => isTaskOverdue(task)}
            canMove={canMove}
            onOpenTask={openTask}
            onEditTask={taskForm.edit}
            onMoveTask={move}
            menuColumns={columns}
            blocked={blocked}
            onDeleteTask={(task) => canDelete(task) ? () => askDelete(task) : undefined}
            emptyTitle={filters.active ? 'Aucune tâche ne correspond aux filtres' : 'Aucune tâche pour ce projet'}
          />
        </div>
      )}
      </div>

      </>
      )}

      <TaskDialog
        open={taskForm.open}
        task={editedTask}
        form={taskForm.form}
        titleError={taskForm.titleError}
        error={taskForm.error}
        saving={taskForm.saving}
        disabled={mutationPending}
        submitDisabled={taskForm.submitDisabled}
        projectDueDate={project.dueDate}
        statusValue={taskForm.statusValue}
        statusOptions={taskForm.missingDefaultStatus ? [{ value: '', label: 'Choisir un statut du projet' }, ...statusOptions] : statusOptions}
        priorityOptions={priorityOptions}
        memberOptions={memberOptions}
        labelOptions={labelOptions}
        loads={loads}
        onStatusChange={taskForm.onStatusChange}
        onChange={taskForm.update}
        onClose={taskForm.cancel}
        onSubmit={taskForm.submit}
        onDelete={editedTask && canDelete(editedTask) ? () => askDelete(editedTask) : undefined}
      >
        {creationNotice}
      </TaskDialog>

      {deleting && (
        <TaskDeleteConfirm
          cancelDisabled={mutationPending}
          confirmDisabled={mutationPending || blocked(deleting)}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            const task = deleting;
            setDeleting(null);
            if (taskForm.editingTaskId === task.id) taskForm.cancel();
            if (viewedTaskId === task.id) onViewTask?.(null);
            void onDeleteTask(project.id, task.id, task.title);
          }}
        />
      )}
    </div>
  );
}
