import type { GanttMilestoneItem, GanttRow } from '@mairie360/lib-components/primitives';
import type { Milestone, ProjectTask } from '@/types/project';

type GanttState = GanttRow['state'];

const DAY = /^\d{4}-\d{2}-\d{2}$/;
// A calendar day that exists (`2027-02-30` does not: Date would roll it over to March).
const isDay = (value: string | null | undefined): value is string => {
  if (typeof value !== 'string' || !DAY.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
};

/** MAIR-868: colour of a bar — done, late (due day past, not done), in progress, or to do. */
export function taskGanttState(task: Pick<ProjectTask, 'status' | 'completed' | 'dueDate'>, today: string): GanttState {
  if (task.completed || task.status === 'done') return 'done';
  if (isDay(task.dueDate) && task.dueDate < today) return 'late';
  return task.status === 'todo' ? 'todo' : 'doing';
}

const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');

/**
 * MAIR-868 (C1): one row per task that has a due date, from its start date (MAIR-1087) to its due date; a task without
 * start date is a one-day bar on its due date, a start after the due date (refused by the BFF) is ignored.
 */
export function planningRows(tasks: readonly ProjectTask[], today: string): GanttRow[] {
  return tasks
    .filter((task) => isDay(task.dueDate))
    .map((task) => {
      const start = isDay(task.startDate) && task.startDate <= task.dueDate ? task.startDate : task.dueDate;
      const assignee = task.assignees[0] ?? task.responsible;
      return {
        id: task.id,
        label: task.title,
        state: taskGanttState(task, today),
        start,
        end: task.dueDate,
        ...(assignee?.name ? { assigneeInitials: initials(assignee.name) } : {}),
      };
    })
    .sort((left, right) => String(left.start).localeCompare(String(right.start)) || String(left.end).localeCompare(String(right.end)) || left.label.localeCompare(right.label, 'fr'));
}

/** MAIR-868 (C3): the milestones of the project, named « titre · date · état » by the lib tooltip. */
export function planningMilestones(milestones: readonly Milestone[]): GanttMilestoneItem[] {
  return milestones.filter((milestone) => isDay(milestone.dueDate)).map((milestone) => ({ id: milestone.id, label: milestone.title, date: milestone.dueDate, reached: milestone.reached }));
}

/**
 * The shown period: from the first day of the month of the earliest date to the last day of the month of the latest
 * one (tasks, milestones and today, so the « aujourd'hui » marker stays in view); `null` when there is nothing to plan.
 */
export function planningPeriod(rows: readonly GanttRow[], milestones: readonly GanttMilestoneItem[], today: string) {
  const days = [...rows.flatMap((row) => [String(row.start), String(row.end)]), ...milestones.map((milestone) => String(milestone.date))];
  if (days.length === 0) return null;
  const sorted = [...days, today].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const [year, month] = last.split('-').map(Number);
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { from: `${first.slice(0, 7)}-01`, to: end };
}
