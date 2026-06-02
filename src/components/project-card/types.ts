import type { Project, ProjectTaskDraft } from '../../types/project';

export type ProjectCardVariant = 'kanban' | 'grid';

export type SelectOption = {
  label: string;
  value: string;
};

export type ProjectCardProps = {
  project: Project;
  variant?: ProjectCardVariant;
  memberOptions?: SelectOption[];
  labelOptions?: SelectOption[];
  onOpen?: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDuplicate?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onAddTask?: (project: Project, task: ProjectTaskDraft) => void;
};

