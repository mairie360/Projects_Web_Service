import { statuses, type Status, type StatusPillTone } from '@mairie360/lib-components/primitives';
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

/** Displayed key of a project, « PRJ-12 » as in the artifact (display only: the id stays the BFF one). */
export function getProjectNumber(project: Pick<Project, 'id'>) {
  const numericId = Number(project.id);
  if (Number.isFinite(numericId)) return `PRJ-${numericId}`;

  return `PRJ-${project.id.replace(/\D/g, '').slice(-4) || '1'}`;
}

/** Status of the lib `StatusBadge` for each project or task status (MAIR-828: one colour per status in every front). */
export const projectStatusBadge = {
  todo: 'todo',
  'in-progress': 'inprogress',
  review: 'review',
  // MAIR-1084: a project put on hold reads « Suspendu », the lib's `paused` status.
  'on-hold': 'paused',
  done: 'done',
} as const satisfies Record<Project['status'], Status>;

/** MAIR-1134: tone of the StatusPill heading a lib `KanbanColumn` of that status. */
export const projectColumnTone = {
  todo: 'neutral',
  'in-progress': 'info',
  review: 'warning',
  'on-hold': 'warning',
  done: 'success',
} as const satisfies Record<Project['status'], StatusPillTone>;

/** Order of the Kanban columns in the artifact: À faire, En cours, En revue, Terminé, Suspendu. */
export const PROJECT_COLUMN_ORDER: readonly Project['status'][] = ['todo', 'in-progress', 'review', 'done', 'on-hold'];

/** The BFF columns in the artifact order (unknown statuses last, in their BFF order). */
export function orderProjectColumns<T extends { status: Project['status'] }>(columns: readonly T[]): T[] {
  const rank = (status: Project['status']) => {
    const index = PROJECT_COLUMN_ORDER.indexOf(status);
    return index === -1 ? PROJECT_COLUMN_ORDER.length : index;
  };
  return [...columns].sort((left, right) => rank(left.status) - rank(right.status));
}

/** French label of a project or task status, the one the lib `StatusBadge` shows (« En revue »). */
export const projectStatusLabel = (status: Project['status']) => statuses[projectStatusBadge[status]].label;

/** Day of `now` in the instance time zone, as `YYYY-MM-DD` (the format of the BFF due dates). */
export function instanceToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: getInstanceTimeZone(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** MAIR-829: « En retard » — the due date is past in the instance time zone and the project is not done. */
export function isProjectOverdue(project: Pick<Project, 'dueDate' | 'status'>, now = new Date()) {
  // An absent or impossible date (« Sans échéance », « Échéance invalide ») is never late.
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(project.dueDate) && formatProjectDate(project.dueDate) !== 'Échéance invalide';
  return project.status !== 'done' && valid && project.dueDate < instanceToday(now);
}

const ALL_PROJECT_STATUSES: Project['status'][] = ['todo', 'in-progress', 'review', 'on-hold', 'done'];
/** Statuses a closed project can be reopened in (« Rouvrir le projet en »). */
export const REOPEN_STATUSES: Project['status'][] = ['todo', 'in-progress', 'review', 'on-hold'];

/** A closed project (`done`) is read-only: the BFF turns its edit rights off and grants `canReopen` to its managers. */
export const isProjectReadOnly = (project: Pick<Project, 'status'>) => project.status === 'done';

/** The caller reopens this closed project rather than editing it. */
export const isProjectReopenable = (project: Pick<Project, 'status' | 'permissions'>) =>
  isProjectReadOnly(project) && project.permissions?.canReopen === true;

/**
 * Statuses the caller may move the project to: every one with `canEdit`, the open ones when they may only reopen it,
 * none otherwise. The current status is included; callers ignore it.
 */
export function projectStatusTargets(project: Pick<Project, 'status' | 'permissions'>): Project['status'][] {
  if (project.permissions?.canEdit === true) return ALL_PROJECT_STATUSES;
  return isProjectReopenable(project) ? REOPEN_STATUSES : [];
}
