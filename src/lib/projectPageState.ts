import { Grid3X3, Kanban, List } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
  taskItems: ProjectTask[];
};

export type TaskFormState = {
  title: string;
  status: Project['status'];
  priority: Project['priority'];
  assignees: string[];
  labels: string[];
  dueDate: string;
};

export const statusOptions: FilterOption[] = [
  { label: 'Tous les statuts', value: 'all' },
  { label: 'À faire', value: 'todo' },
  { label: 'En cours', value: 'in-progress' },
  { label: 'En révision', value: 'review' },
  { label: 'Terminé', value: 'done' },
];

export const priorityOptions: FilterOption[] = [
  { label: 'Toutes les priorités', value: 'all' },
  { label: 'Haute', value: 'high' },
  { label: 'Moyenne', value: 'medium' },
  { label: 'Basse', value: 'low' },
];

export const viewOptions: { value: ViewMode; label: string; icon: LucideIcon }[] = [
  { value: 'kanban', label: 'Kanban', icon: Kanban },
  { value: 'grid', label: 'Grille', icon: Grid3X3 },
  { value: 'table', label: 'Table', icon: List },
];

export const projectStatusOptions = statusOptions.filter((option) => option.value !== 'all');
export const taskStatusOptions = projectStatusOptions.filter((option) => option.value !== 'review');
export const projectPriorityOptions = priorityOptions.filter((option) => option.value !== 'all');
export const defaultProjectMembers = [
  'Alex Moreau',
  'Jean Dupont',
  'Marie Dubois',
  'Pierre Martin',
  'Sophie Leroy',
  'Thomas Bernard',
];
export const defaultProjectLabels = [
  'Administration',
  'Archives',
  'Communication',
  'Énergie',
  'Environnement',
  'Espaces verts',
  'Infrastructure',
  'Loisirs',
  'Numérique',
  'Travaux',
  'Urgent',
  'Voirie',
];

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

const generatedTaskTitles = [
  'Cadrer le besoin avec les services',
  'Préparer le dossier administratif',
  'Valider le budget prévisionnel',
  'Consulter les prestataires',
  'Planifier les interventions',
  'Informer les habitants',
  'Contrôler les livrables',
  'Rédiger le compte rendu',
  'Mettre à jour le planning',
  'Archiver les documents',
];

export function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getDateWithOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return formatInputDate(date);
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
    dueDate: getDateWithOffset(30),
    progress: 0,
    totalTasks: 0,
    completedTasks: 0,
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
  if (project.taskItems) return project.taskItems;

  return Array.from({ length: project.tasks.total }, (_, index) => {
    const completed = index < project.tasks.completed;
    const assignee = project.assignees[index % Math.max(project.assignees.length, 1)] ?? project.responsible;

    return {
      id: `${project.id}-task-${index + 1}`,
      title: generatedTaskTitles[index % generatedTaskTitles.length],
      status: completed ? 'done' : project.status === 'done' ? 'todo' : project.status,
      responsible: { ...assignee },
      assignees: [{ ...assignee }],
      priority: project.priority,
      labels: project.labels.slice(0, Math.min(project.labels.length, 2)),
      dueDate: project.dueDate,
      completed,
      createdAt: project.createdAt,
    };
  });
}

export function calculateProjectProgress(tasks: ProjectTask[]) {
  if (tasks.length === 0) return 0;

  return Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100);
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
    taskItems: createInitialTaskItems(project),
  };
}
