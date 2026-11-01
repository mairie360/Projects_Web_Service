import { calculateProjectProgress, getPersonValue, type ProjectFormState, type TaskFormState } from '@/lib/projectPageState';
import type { ProjectTask } from '@/types/project';

// The listed tasks are the active ones: the archived (done) tasks still count in the summary.
export function createTaskSummaryPatch(taskItems: ProjectTask[], archivedTasks: number): Pick<ProjectFormState, 'taskItems' | 'totalTasks' | 'completedTasks' | 'progress'> {
  const completedTasks = taskItems.filter((task) => task.completed).length + archivedTasks;

  return {
    taskItems,
    totalTasks: taskItems.length + archivedTasks,
    completedTasks,
    progress: calculateProjectProgress(taskItems, archivedTasks),
  };
}

export function createDraftTaskId(taskItems: ProjectTask[]): string {
  const base = `task-${Date.now()}`;
  const existingIds = new Set(taskItems.map((task) => task.id));
  let candidate = base;
  let suffix = 0;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${++suffix}`;
  }
  return candidate;
}

// null is private draft state: use the live project default until the date is
// explicitly chosen or cleared. Existing tasks always own their string date.
export type TaskDraftFormState = Omit<TaskFormState, 'dueDate'> & { dueDate: string | null };

export function createTaskFormStateFromProjectForm(form: ProjectFormState): TaskDraftFormState {
  return {
    title: '',
    status: form.status,
    priority: form.priority,
    assignees: [],
    labels: [],
    dueDate: null,
  };
}

export function taskToFormState(task: ProjectTask): TaskFormState {
  const assigneeNames = [getPersonValue(task.responsible), ...(task.assignees ?? []).map(getPersonValue)];

  return {
    title: task.title,
    status: task.status,
    ...(task.statusId ? { statusId: task.statusId } : {}),
    priority: task.priority,
    assignees: uniqueAssigneesInOrder(assigneeNames),
    labels: task.labels,
    dueDate: task.dueDate,
  };
}

export function uniqueAssigneesInOrder(values: string[]): string[] {
  // The first assignee carries the primary choice; sorting IDs reassigns tasks.
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
