import React from 'react';
import { getPersonValue } from '@/lib/projectPageState';
import type { ProjectTask } from '@/types/project';
import { instanceToday } from '@/components/ProjectsWorkspace/project-card-meta';
import { isTaskOverdue, TASK_COLUMNS, taskColumn } from './components/ProjectTasksTab';

/** The people a task is given to, the first one being its responsible (« Assignée à »). */
export const taskAssignees = (task: Pick<ProjectTask, 'assignees' | 'responsible'>) =>
  (task.assignees?.length ? task.assignees : [task.responsible]).filter((person) => person?.name);

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

/**
 * MAIR-859 (Figma F6 6.13): search on the title and the labels, « Tous les assignés » and « Toutes les priorités »;
 * « Tous les statuts » and « Toutes les échéances » combine with them, and `reset` clears them all.
 * The filters are local to the loaded tasks: the contract has no task query.
 */
export function useTaskFilters({ tasks }: { tasks: ProjectTask[] }) {
  const [search, setSearch] = React.useState('');
  const [assignee, setAssignee] = React.useState('');
  const [priority, setPriority] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [due, setDue] = React.useState<TaskDueFilter>('');

  const assigneeOptions = React.useMemo(() => {
    const options = new Map<string, string>();
    for (const task of tasks) {
      for (const person of taskAssignees(task)) {
        const value = getPersonValue(person);
        if (value && !options.has(value)) options.set(value, person.name);
      }
    }
    return [...options].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }, [tasks]);

  const matches = React.useCallback((task: ProjectTask) => {
    const text = search.trim().toLowerCase();
    const matchesSearch = !text || task.title.toLowerCase().includes(text) || task.labels.some((label) => label.toLowerCase().includes(text));
    const matchesAssignee = !assignee || taskAssignees(task).some((person) => getPersonValue(person) === assignee);
    const matchesPriority = !priority || task.priority === priority;
    const matchesStatus = !status || taskColumn(task) === status;
    return matchesSearch && matchesAssignee && matchesPriority && matchesStatus && matchesTaskDue(task, due);
  }, [assignee, due, priority, search, status]);

  const filteredTasks = React.useMemo(() => tasks.filter(matches), [matches, tasks]);
  const active = Boolean(search.trim() || assignee || priority || status || due);

  const reset = () => {
    setSearch('');
    setAssignee('');
    setPriority('');
    setStatus('');
    setDue('');
  };

  return {
    search, assignee, priority, status, due, assigneeOptions, active,
    setSearch, setAssignee, setPriority, setStatus, setDue, matches, filteredTasks, reset,
  };
}

export type TaskFiltersState = ReturnType<typeof useTaskFilters>;
