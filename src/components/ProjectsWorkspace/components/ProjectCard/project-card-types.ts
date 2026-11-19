import type { Project } from '@/types/project';

export type ProjectCardVariant = 'kanban' | 'grid';

export type ProjectCardProps = {
  project: Project;
  variant?: ProjectCardVariant;
  duplicationPending?: boolean;
  duplicationVerificationRequired?: boolean;
  onOpen?: (project: Project) => void;
  onDuplicate?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  /** « Changer le statut » of the card menu (MAIR-829). */
  onChangeStatus?: (project: Project, status: Project['status']) => void | Promise<void>;
};
