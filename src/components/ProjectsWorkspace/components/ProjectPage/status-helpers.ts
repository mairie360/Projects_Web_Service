import type { TaskStatusCategory, TaskStatusDefinition } from '@/lib/projectWorkflow';
import type { ProjectStatus } from '@/types/project';

export const categoryOf = (status: ProjectStatus): TaskStatusCategory => status === 'done' ? 'done' : status === 'todo' ? 'todo' : 'inprogress';

// Maps between the project's own statuses (when it has some) and the standard categories.
export function projectStatusHelpers(dynamicStatuses: TaskStatusDefinition[] | undefined) {
  return {
    firstStatusOf: (category: TaskStatusCategory) => dynamicStatuses?.find(status => status.category === category)?.id,
    categoryStatus: (id: string): ProjectStatus => {
      const category = dynamicStatuses?.find(status => status.id === id)?.category;
      return category === 'inprogress' ? 'in-progress' : category ?? 'todo';
    },
  };
}
