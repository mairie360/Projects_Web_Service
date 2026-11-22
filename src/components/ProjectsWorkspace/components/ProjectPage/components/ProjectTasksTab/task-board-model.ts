import { isProjectOverdue } from '@/components/ProjectsWorkspace/project-card-meta';
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

/** A task placed on the board: its column (the one it is moving to while the write runs) and whether it left the detail. */
export type BoardTask = { task: ProjectTask; column: TaskColumnStatus; archived: boolean; moving: boolean };

/** « + 3 tâches terminées »: the done tasks the BFF archived, counted but not listed (MAIR-559). */
export function archivedTasksMore(count: number) {
  return count > 0 ? `+ ${count} tâche${count > 1 ? 's' : ''} terminée${count > 1 ? 's' : ''}` : '';
}
