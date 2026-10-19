import type { Person, Project, ProjectTask } from '../types/project';

export type ViewMode = 'kanban' | 'grid' | 'table';

export type FilterOption = {
  label: string;
  value: string;
  name?: string;
  avatarUrl?: string | null;
};

export type ProjectFormState = {
  title: string;
  description: string;
  status: Project['status'];
  priority: Project['priority'];
  responsible: string;
  assignees: string[];
  labels: string[];
  dueDate: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  /** Archived (done) tasks of the project: counted as done, never listed in `taskItems`. */
  archivedTasks: number;
  taskItems: ProjectTask[];
};

export type TaskFormState = {
  title: string;
  status: Project['status'];
  statusId?: string;
  priority: Project['priority'];
  assignees: string[];
  labels: string[];
  dueDate: string;
};

export function getUniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'fr')
  );
}

export function createSelectOptions(values: string[]): FilterOption[] {
  return getUniqueValues(values).map((value) => ({ label: value, value }));
}

export function getPersonValue(person: Person) {
  return person.id ?? person.name;
}

export function createPersonFromOptionValue(value: string, options: FilterOption[]): Person {
  const option = options.find((currentOption) => currentOption.value === value);

  if (!option) return { name: value };

  return {
    id: option.value,
    name: option.name ?? option.label,
    avatarUrl: option.avatarUrl ?? null,
  };
}

export function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function createProjectFormState(status: Project['status'] = 'todo'): ProjectFormState {
  return {
    title: '',
    description: '',
    status,
    priority: 'medium',
    responsible: '',
    assignees: [],
    labels: [],
    dueDate: '',
    progress: 0,
    totalTasks: 0,
    completedTasks: 0,
    archivedTasks: 0,
    taskItems: [],
  };
}

export function createTaskFormState(project: Project): TaskFormState {
  return {
    title: '',
    status: project.status,
    priority: project.priority,
    assignees: [getPersonValue(project.responsible)],
    labels: [],
    dueDate: project.dueDate,
  };
}

export function createInitialTaskItems(project: Project): ProjectTask[] {
  return project.taskItems ?? [];
}

/** Archived (done) tasks are counted but not listed (MAIR-559): the counter says how many are hidden. */
export function archivedTasksLabel(archivedTasks: number) {
  return archivedTasks === 1 ? '1 tâche archivée' : `${archivedTasks} tâches archivées`;
}

/** Share of done tasks, the `archivedTasks` (done tasks the BFF no longer lists) included. */
export function calculateProjectProgress(tasks: Pick<ProjectTask, 'completed'>[], archivedTasks = 0) {
  const total = tasks.length + archivedTasks;
  if (total === 0) return 0;

  return Math.round(((tasks.filter((task) => task.completed).length + archivedTasks) / total) * 100);
}

export function projectToFormState(project: Project): ProjectFormState {
  const responsibleValue = getPersonValue(project.responsible);
  const participantValues = getUniqueValues(project.assignees.map(getPersonValue));

  return {
    title: project.title,
    description: project.description,
    status: project.status,
    priority: project.priority,
    responsible: responsibleValue,
    assignees: participantValues,
    labels: project.labels,
    dueDate: project.dueDate,
    progress: project.progress,
    totalTasks: project.tasks.total,
    completedTasks: project.tasks.completed,
    archivedTasks: project.tasks.archived,
    taskItems: createInitialTaskItems(project),
  };
}
