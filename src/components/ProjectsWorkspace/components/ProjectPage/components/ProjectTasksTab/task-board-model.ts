import { instanceToday, isProjectOverdue } from '@/components/ProjectsWorkspace/project-card-meta';
import type { ProjectTask } from '@/types/project';
import type { TaskColumnStatus } from '../../use-detail-task-form';

/** MAIR-859 (Figma F6 6.2): the three columns of the board; « En revue » tasks sit in « En cours ». */
export const TASK_COLUMNS: ReadonlyArray<{ status: TaskColumnStatus; label: string }> = [
  { status: 'todo', label: 'À faire' },
  { status: 'in-progress', label: 'En cours' },
  { status: 'done', label: 'Terminé' },
];

export const taskColumnLabel = (status: TaskColumnStatus) => TASK_COLUMNS.find((column) => column.status === status)?.label ?? status;

/** Column of a task: its status category (a project status of the `inprogress` category or « En revue » is « En cours »). */
export function taskColumn(task: Pick<ProjectTask, 'status' | 'completed'>): TaskColumnStatus {
  if (task.status === 'done' || task.completed) return 'done';
  return task.status === 'todo' ? 'todo' : 'in-progress';
}

/** « En retard »: the due date is past in the instance day and the task is not done (MAIR-829 rule of the projects). */
export const isTaskOverdue = (task: Pick<ProjectTask, 'dueDate' | 'status' | 'completed'>, now = new Date()) =>
  taskColumn(task) !== 'done' && isProjectOverdue({ dueDate: task.dueDate, status: 'todo' }, now);

/** « Toutes les échéances »: the due-date ranges of the tasks toolbar, read in the instance day. */
export type TaskDueFilter = '' | 'overdue' | 'this-month' | 'later' | 'none';

export const TASK_DUE_OPTIONS: ReadonlyArray<{ value: Exclude<TaskDueFilter, ''>; label: string }> = [
  { value: 'overdue', label: 'En retard' },
  { value: 'this-month', label: 'Ce mois-ci' },
  { value: 'later', label: 'Plus tard' },
  { value: 'none', label: 'Sans échéance' },
];

/** « Tous les statuts »: one option per column of the board (the workflow categories of the project). */
export const TASK_STATUS_OPTIONS = TASK_COLUMNS.map((column) => ({ value: column.status, label: column.label }));

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether a task falls in a due-date range: « En retard » is the overdue badge rule; « Ce mois-ci » is a due date
 * in the current instance month that is not overdue; « Plus tard » is after that month; « Sans échéance » has no date.
 */
export function matchesTaskDue(task: Pick<ProjectTask, 'dueDate' | 'status' | 'completed'>, due: TaskDueFilter, now = new Date()) {
  if (!due) return true;
  const dated = DAY_PATTERN.test(task.dueDate ?? '');
  if (due === 'none') return !dated;
  if (!dated) return false;
  const overdue = isTaskOverdue(task, now);
  if (due === 'overdue') return overdue;
  const month = instanceToday(now).slice(0, 7);
  const dueMonth = task.dueDate.slice(0, 7);
  return due === 'this-month' ? !overdue && dueMonth === month : dueMonth > month;
}

/** A task placed on the board: its column (the one it is moving to while the write runs) and whether it left the detail. */
export type BoardTask = { task: ProjectTask; column: TaskColumnStatus; archived: boolean; moving: boolean };

/** « + 3 tâches terminées »: the done tasks the BFF archived, counted but not listed (MAIR-559). */
export function archivedTasksMore(count: number) {
  return count > 0 ? `+ ${count} tâche${count > 1 ? 's' : ''} terminée${count > 1 ? 's' : ''}` : '';
}

const DAY = 86_400_000;
const isoDay = (value: string) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T00:00:00Z`) : Number.NaN);

/**
 * MAIR-1137 (C12, C15): the time left before a due date, in instance days — « Dans 12 jours », « Aujourd’hui »,
 * « En retard de 3 jours »; an absent or impossible date gives `''`.
 */
export function taskDelayLabel(dueDate: string, now = new Date()) {
  const due = isoDay(dueDate);
  const today = isoDay(instanceToday(now));
  if (Number.isNaN(due) || Number.isNaN(today)) return '';
  const days = Math.round((due - today) / DAY);
  if (days === 0) return 'Aujourd’hui';
  const count = Math.abs(days);
  const unit = `${count} jour${count > 1 ? 's' : ''}`;
  return days > 0 ? `Dans ${unit}` : `En retard de ${unit}`;
}

/** MAIR-1137 (C12): a task due after its project (« Après la fin du projet »). */
export const dueAfterProject = (taskDue: string, projectDue: string) =>
  !Number.isNaN(isoDay(taskDue)) && !Number.isNaN(isoDay(projectDue)) && taskDue > projectDue;

/** MAIR-1137 (C12): the active tasks each agent holds, for the « charge » of the assignee cards. */
export function assigneeLoads(tasks: readonly ProjectTask[]) {
  const loads = new Map<string, number>();
  for (const task of tasks) {
    if (taskColumn(task) === 'done') continue;
    // An agent who is both responsible and assignee of a task counts it once.
    const people = new Set([task.responsible, ...(task.assignees ?? [])].map((person) => person?.id ?? person?.name).filter(Boolean).map(String));
    for (const key of people) loads.set(key, (loads.get(key) ?? 0) + 1);
  }
  return loads;
}
