'use client';

import React from 'react';
import { ListChecks } from 'lucide-react';
import { archivedTasksLabel, type FilterOption } from '@/lib/projectPageState';
import type { TaskStatusDefinition } from '@/lib/projectWorkflow';
import type { Project, ProjectStatus, ProjectTask } from '@/types/project';
import { projectStatusHelpers } from '../../status-helpers';
import type { TaskCollaborationState } from '../../use-task-collaboration';
import type { TaskFiltersState } from '../../use-task-filters';
import { TaskDeleteConfirm } from './components/TaskDeleteConfirm';
import { TaskFilters } from './components/TaskFilters';
import { TaskFollowUp } from './components/TaskFollowUp';
import { TaskRow } from './components/TaskRow';

export function DetailTaskList({
  project,
  tasks,
  filters,
  collaboration,
  taskStatusOptions,
  priorityOptions,
  dynamicStatuses,
  pendingTaskIds,
  unverifiedTaskIds,
  taskWriteErrors,
  mutationPending,
  highlightTaskId,
  highlightedTaskRef,
  deletingTaskId,
  onDeletingChange,
  onUpdateTaskStatus,
  onDeleteTask,
  onEditTask,
}: {
  project: Project;
  tasks: ProjectTask[];
  filters: TaskFiltersState;
  collaboration: TaskCollaborationState;
  taskStatusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  dynamicStatuses: TaskStatusDefinition[] | undefined;
  pendingTaskIds?: ReadonlySet<string>;
  unverifiedTaskIds?: ReadonlySet<string>;
  taskWriteErrors?: ReadonlyMap<string, string>;
  mutationPending: boolean;
  highlightTaskId?: string | null;
  highlightedTaskRef: React.MutableRefObject<HTMLElement | null>;
  deletingTaskId: string | null;
  onDeletingChange: (taskId: string | null) => void;
  onUpdateTaskStatus: (projectId: string, taskId: string, status: ProjectStatus, statusId?: string) => void | Promise<void>;
  onDeleteTask: (projectId: string, taskId: string, taskTitle: string) => Promise<void>;
  onEditTask: (task: ProjectTask) => void;
}) {
  const { firstStatusOf, categoryStatus } = projectStatusHelpers(dynamicStatuses);

  return (
    <section className="overflow-hidden rounded-md border border-[#d9d5d0] bg-[#fbfaf8]">
      <div className="flex items-center justify-between border-b border-[#dedbd6] bg-[#f1eee9] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#24292f]">
          <ListChecks className="h-4 w-4 text-[#57606a]" strokeWidth={1.8} />
          Tâches
        </div>
        <span className="text-xs font-medium text-[#57606a]">
          {project.tasks.completed}/{project.tasks.total}
          {project.tasks.archived > 0 && ` · ${archivedTasksLabel(project.tasks.archived)}`}
        </span>
      </div>

      {pendingTaskIds && [...pendingTaskIds].some(id => !tasks.some(task => task.id === id)) && (
        <p role="status" className="px-4 py-2 text-xs text-[#57606a]">Actualisation des tâches en cours…</p>
      )}

      {tasks.length > 0 && (
        <TaskFilters
          search={filters.search}
          status={filters.status}
          priority={filters.priority}
          due={filters.due}
          statusOptions={taskStatusOptions}
          priorityOptions={priorityOptions}
          onSearchChange={filters.setSearch}
          onStatusChange={filters.setStatus}
          onPriorityChange={filters.setPriority}
          onDueChange={filters.setDue}
        />
      )}

      {tasks.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-[#57606a]">Aucune tâche pour ce projet.</div>
      ) : filters.filteredTasks.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-[#57606a]">Aucune tâche ne correspond aux filtres.</div>
      ) : (
        <div className="divide-y divide-[#d8dee4]">
          {filters.filteredTasks.map((task) => {
            const isLinkedTask = highlightTaskId === task.id;
            const taskPending = pendingTaskIds?.has(task.id) ?? false;
            const taskMutationBlocked = taskPending || (unverifiedTaskIds?.has(task.id) ?? false);
            const reopening = task.completed || task.status === 'done';
            const toggleStatusId = dynamicStatuses ? firstStatusOf(reopening ? 'todo' : 'done') : undefined;

            return (
              <TaskRow
                key={task.id}
                task={task}
                linked={isLinkedTask}
                articleRef={isLinkedTask ? highlightedTaskRef : undefined}
                pending={taskPending}
                blocked={taskMutationBlocked}
                mutationPending={mutationPending}
                toggleDisabled={(!!dynamicStatuses && !toggleStatusId) || mutationPending || taskMutationBlocked || task.permissions?.canUpdateStatus === false}
                statusValue={dynamicStatuses ? task.statusId : task.status}
                statusOptions={taskStatusOptions}
                writeError={taskWriteErrors?.get(task.id)}
                deleting={deletingTaskId === task.id}
                // With project statuses, completing uses the first "Terminé" status, reopening the first "À faire".
                onToggleDone={() => onUpdateTaskStatus(project.id, task.id, reopening ? 'todo' : 'done', toggleStatusId)}
                onStatusChange={(value) => onUpdateTaskStatus(project.id, task.id, dynamicStatuses ? categoryStatus(value) : value as ProjectStatus, dynamicStatuses ? value : undefined)}
                onFollowUp={() => void collaboration.open(task.id)}
                onEdit={() => onEditTask(task)}
                onAskDelete={() => onDeletingChange(task.id)}
              >
                {deletingTaskId === task.id && (
                  <TaskDeleteConfirm
                    cancelDisabled={mutationPending}
                    confirmDisabled={mutationPending || taskMutationBlocked}
                    onCancel={() => onDeletingChange(null)}
                    onConfirm={() => {
                      onDeletingChange(null);
                      void onDeleteTask(project.id, task.id, task.title);
                    }}
                  />
                )}
                {collaboration.taskId === task.id && (
                  <TaskFollowUp
                    taskTitle={task.title}
                    loading={collaboration.loading}
                    saving={collaboration.saving}
                    error={collaboration.error}
                    collaboration={collaboration.collaboration}
                    canComment={task.permissions?.canComment !== false}
                    message={collaboration.message}
                    onMessageChange={collaboration.setMessage}
                    onRefresh={collaboration.refresh}
                    onSubmit={(event) => void collaboration.submit(event, task.id)}
                  />
                )}
              </TaskRow>
            );
          })}
        </div>
      )}
    </section>
  );
}
