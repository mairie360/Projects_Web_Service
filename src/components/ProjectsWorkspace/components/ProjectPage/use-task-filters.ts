import React from 'react';
import { getPersonValue } from '@/lib/projectPageState';
import type { ProjectTask } from '@/types/project';

/** The people a task is given to, the first one being its responsible (« Assignée à »). */
export const taskAssignees = (task: Pick<ProjectTask, 'assignees' | 'responsible'>) =>
  (task.assignees?.length ? task.assignees : [task.responsible]).filter((person) => person?.name);

/**
 * MAIR-859 (Figma F6 6.13): search on the title and the labels, « Tous les assignés » and « Toutes les priorités ».
 * The filters are local to the loaded tasks: the contract has no task query.
 */
export function useTaskFilters({ tasks }: { tasks: ProjectTask[] }) {
  const [search, setSearch] = React.useState('');
  const [assignee, setAssignee] = React.useState('');
  const [priority, setPriority] = React.useState('');

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
    return matchesSearch && matchesAssignee && matchesPriority;
  }, [assignee, priority, search]);

  const filteredTasks = React.useMemo(() => tasks.filter(matches), [matches, tasks]);
  const active = Boolean(search.trim() || assignee || priority);

  const reset = () => {
    setSearch('');
    setAssignee('');
    setPriority('');
  };

  return { search, assignee, priority, assigneeOptions, active, setSearch, setAssignee, setPriority, matches, filteredTasks, reset };
}

export type TaskFiltersState = ReturnType<typeof useTaskFilters>;
