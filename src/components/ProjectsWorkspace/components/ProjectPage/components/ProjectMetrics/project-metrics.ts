import { formatProjectDate, instanceToday } from '../../../../project-card-meta';
import type { Project, ProjectTask } from '@/types/project';

const DAY = 86_400_000;
const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isValidDate = (date: string) => VALID_DATE.test(date) && !formatProjectDate(date).startsWith('Échéance');
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY;

const LONG_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
/** « 15 déc. 2026 »; an absent or impossible date keeps the wording of `formatProjectDate`. */
export function formatLongDate(date: string) {
  if (!isValidDate(date)) return formatProjectDate(date);
  return LONG_DATE.format(new Date(`${date}T00:00:00Z`));
}

/** MAIR-846 (C4) « Avancement »: progress of the BFF and its tasks count (archived done tasks included). */
export function progressMetric(project: Project) {
  return { value: `${project.progress} %`, detail: `${project.tasks.completed}/${project.tasks.total} tâches terminées` };
}

/** MAIR-846 (C4) « Échéance »: J-xx, « Aujourd’hui » or the delay, from the instance day. */
export function dueMetric(project: Pick<Project, 'dueDate' | 'status'>, today = instanceToday()) {
  if (!isValidDate(project.dueDate)) return { value: '—', detail: formatProjectDate(project.dueDate) };
  const days = dayNumber(project.dueDate) - dayNumber(today);
  const detail = `Fin prévue le ${formatLongDate(project.dueDate)}`;
  if (project.status === 'done') return { value: 'Terminé', detail };
  if (days > 0) return { value: `J-${days}`, detail };
  if (days === 0) return { value: 'Aujourd’hui', detail };
  return { value: `${-days} j de retard`, detail };
}

/** An open task whose due date is past in the instance time zone. */
export function isTaskOverdue(task: Pick<ProjectTask, 'dueDate' | 'status' | 'completed'>, today = instanceToday()) {
  return !task.completed && task.status !== 'done' && isValidDate(task.dueDate) && task.dueDate < today;
}

/** MAIR-846 (C4) « Tâches en retard ». */
export function overdueTasksMetric(tasks: ProjectTask[], today = instanceToday()) {
  const count = tasks.filter((task) => isTaskOverdue(task, today)).length;
  return { value: String(count), detail: count === 0 ? 'Tout est dans les temps' : `${count > 1 ? 'Tâches' : 'Tâche'} à traiter en priorité` };
}
