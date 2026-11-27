import { instanceToday } from './project-card-meta';

/** « Échéance » of the projects toolbar: the due-date ranges of the artifact, read in the instance day. */
export type ProjectDueRange = '' | 'overdue' | 'this-month' | 'later';

/** The same ranges and labels as the tasks toolbar (« Sans échéance » cannot be asked to the BFF). */
export const PROJECT_DUE_OPTIONS: ReadonlyArray<{ value: Exclude<ProjectDueRange, ''>; label: string }> = [
  { value: 'overdue', label: 'En retard' },
  { value: 'this-month', label: 'Ce mois-ci' },
  { value: 'later', label: 'Plus tard' },
];

/** Inclusive `YYYY-MM-DD` bounds sent as `dueBefore` / `dueAfter` (`''` = no bound). */
export type ProjectDueBounds = { dueBefore: string; dueAfter: string };

const NO_BOUNDS: ProjectDueBounds = { dueBefore: '', dueAfter: '' };

const isoDay = (time: number) => new Date(time).toISOString().slice(0, 10);
const dayTime = (day: string) => Date.parse(`${day}T00:00:00Z`);
const DAY = 86_400_000;

/**
 * Bounds of a range for the instance day of `now`: « En retard » is due before today, « Ce mois-ci » from today to
 * the end of the month, « Plus tard » from the first day of the next month.
 */
export function projectDueBounds(range: ProjectDueRange, now = new Date()): ProjectDueBounds {
  const today = instanceToday(now);
  const [year, month] = today.split('-').map(Number);
  const nextMonth = isoDay(Date.UTC(year, month, 1));
  if (range === 'overdue') return { dueBefore: isoDay(dayTime(today) - DAY), dueAfter: '' };
  if (range === 'this-month') return { dueBefore: isoDay(dayTime(nextMonth) - DAY), dueAfter: today };
  if (range === 'later') return { dueBefore: '', dueAfter: nextMonth };
  return NO_BOUNDS;
}

/** The range the bounds stand for today, `''` when none (no bound, or bounds from an older link). */
export function projectDueRange(bounds: ProjectDueBounds, now = new Date()): ProjectDueRange {
  return PROJECT_DUE_OPTIONS.map((option) => option.value).find((range) => {
    const expected = projectDueBounds(range, now);
    return expected.dueBefore === bounds.dueBefore && expected.dueAfter === bounds.dueAfter;
  }) ?? '';
}

/** Whether a `YYYY-MM-DD` due date lies within the bounds (both inclusive, as the API compares them). */
export function matchesProjectDueBounds(dueDate: string, bounds: ProjectDueBounds) {
  if (!bounds.dueBefore && !bounds.dueAfter) return true;
  const day = dueDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  return (!bounds.dueBefore || day <= bounds.dueBefore) && (!bounds.dueAfter || day >= bounds.dueAfter);
}
