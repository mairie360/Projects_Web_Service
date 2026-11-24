import React from 'react';
import { getPersonValue } from '@/lib/projectPageState';
import type { ProjectTask } from '@/types/project';
import { matchesTaskDue, taskColumn, type TaskDueFilter } from './components/ProjectTasksTab';

/** The people a task is given to, the first one being its responsible (« Assignée à »). */
export const taskAssignees = (task: Pick<ProjectTask, 'assignees' | 'responsible'>) =>
  (task.assignees?.length ? task.assignees : [task.responsible]).filter((person) => person?.name);

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

  const matches = React.useCallback((task: ProjectTask, column = taskColumn(task)) => {
    const text = search.trim().toLowerCase();
    const matchesSearch = !text || task.title.toLowerCase().includes(text) || task.labels.some((label) => label.toLowerCase().includes(text));
    const matchesAssignee = !assignee || taskAssignees(task).some((person) => getPersonValue(person) === assignee);
    const matchesPriority = !priority || task.priority === priority;
    // The board passes the column a card is shown in, its target while a move is pending.
    const matchesStatus = !status || column === status;
    return matchesSearch && matchesAssignee && matchesPriority && matchesStatus && matchesTaskDue(task, due);
  }, [assignee, due, priority, search, status]);

  const filteredTasks = React.useMemo(() => tasks.filter((task) => matches(task)), [matches, tasks]);
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
