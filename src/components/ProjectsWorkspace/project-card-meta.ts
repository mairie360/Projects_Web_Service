import { statuses, type Status } from '@mairie360/lib-components/primitives';
import { getInstanceTimeZone } from '@mairie360/lib-components/shared';
import type { Project } from '../../types/project';

export function formatProjectDate(date: string, withYear = true) {
  if (!date.trim()) return 'Sans échéance';

  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!parts) return 'Échéance invalide';

  const [, year, month, day] = parts;
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const leapYear = yearNumber % 4 === 0 && (yearNumber % 100 !== 0 || yearNumber % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (yearNumber < 1 || dayNumber < 1 || dayNumber > (daysInMonth[monthNumber - 1] ?? 0)) {
    return 'Échéance invalide';
  }

  return withYear ? `${day}/${month}/${year}` : `${day}/${month}`;
}

export function getProjectNumber(project: Project) {
  const numericId = Number(project.id);
  if (Number.isFinite(numericId)) return `#${numericId}`;

  return `#${project.id.replace(/\D/g, '').slice(-4) || '1'}`;
}

/** Status of the lib `StatusBadge` for each project or task status (MAIR-828: one colour per status in every front). */
export const projectStatusBadge = {
  todo: 'todo',
  'in-progress': 'inprogress',
  review: 'review',
  done: 'done',
} as const satisfies Record<Project['status'], Status>;

/** French label of a project or task status, the one the lib `StatusBadge` shows (« En revue »). */
export const projectStatusLabel = (status: Project['status']) => statuses[projectStatusBadge[status]].label;

/** Day of `now` in the instance time zone, as `YYYY-MM-DD` (the format of the BFF due dates). */
export function instanceToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: getInstanceTimeZone(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** MAIR-829: « En retard » — the due date is past in the instance time zone and the project is not done. */
export function isProjectOverdue(project: Pick<Project, 'dueDate' | 'status'>, now = new Date()) {
  return project.status !== 'done' && /^\d{4}-\d{2}-\d{2}$/.test(project.dueDate) && project.dueDate < instanceToday(now);
}
