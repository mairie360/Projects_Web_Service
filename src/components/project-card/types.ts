import type { Project, ProjectTaskDraft } from '../../types/project';
import type { TaskCreationState } from '../project/TaskCreationNotice';
import type { TaskFormState } from '../../lib/projectPageState';

export type ProjectCardVariant = 'kanban' | 'grid';

export type SelectOption = {
  label: string;
  value: string;
};

export type ProjectCardProps = {
  project: Project;
  variant?: ProjectCardVariant;
  duplicationPending?: boolean;
  duplicationVerificationRequired?: boolean;
  taskCreationState?: TaskCreationState;
  onInspectTaskCreation?: (projectId: string) => void | Promise<void>;
  onPreserveTaskDraft?: (projectId: string, patch: Partial<TaskFormState>) => void;
  memberOptions?: SelectOption[];
  labelOptions?: SelectOption[];
  onOpen?: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDuplicate?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onAddTask?: (project: Project, task: ProjectTaskDraft) => void | Promise<void>;
};
