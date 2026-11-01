import React from 'react';
import type { TaskStatusDefinition } from '@/lib/projectWorkflow';
import type { ProjectTask } from '@/types/project';

export function useTaskFilters({ tasks, dynamicStatuses }: { tasks: ProjectTask[]; dynamicStatuses: TaskStatusDefinition[] | undefined }) {
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const [priority, setPriority] = React.useState('all');
  const [due, setDue] = React.useState('');

  const filteredTasks = React.useMemo(() => {
    const text = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch = !text || task.title.toLowerCase().includes(text) ||
        task.labels.some((label) => label.toLowerCase().includes(text));
      const matchesStatus = status === 'all' || (dynamicStatuses ? task.statusId : task.status) === status;
      const matchesPriority = priority === 'all' || task.priority === priority;
      const matchesDueDate = !due || task.dueDate.slice(0, 10) <= due;

      return matchesSearch && matchesStatus && matchesPriority && matchesDueDate;
    });
  }, [dynamicStatuses, due, priority, search, status, tasks]);

  const reset = () => {
    setSearch('');
    setStatus('all');
    setPriority('all');
    setDue('');
  };

  return { search, status, priority, due, setSearch, setStatus, setPriority, setDue, filteredTasks, reset };
}

export type TaskFiltersState = ReturnType<typeof useTaskFilters>;
