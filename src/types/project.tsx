import type {
  ProjectPriority as ContractProjectPriority,
  ProjectStatus as ContractProjectStatus,
  TaskCollaborationResponse,
  TaskComment as ContractTaskComment,
  TaskHistoryEntry as ContractTaskHistoryEntry,
} from '@mairie360/bff-project-openapi/model';

export type ProjectStatus = ContractProjectStatus;
export type ProjectPriority = ContractProjectPriority;

export interface Person {
  id?: string;
  name: string;
  avatar?: string;
  avatarUrl?: string | null;
}

export interface ProjectTask {
  id: string;
  title: string;
  status: ProjectStatus;
  statusId?: string;
  statusName?: string;
  statusLabel?: string;
  responsible: Person;
  assignees: Person[];
  priority: ProjectPriority;
  priorityLabel?: string;
  labels: string[];
  dueDate: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
  permissions?: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canUpdateStatus: boolean;
    canComment: boolean;
  };
}

export type TaskComment = ContractTaskComment;

export type TaskHistoryEntry = ContractTaskHistoryEntry;

export type TaskCollaboration = TaskCollaborationResponse;

export interface ProjectTaskDraft {
  title: string;
  status: ProjectStatus;
  statusId?: string;
  responsible: Person;
  assignees: Person[];
  priority: ProjectPriority;
  labels: string[];
  dueDate: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  statusLabel?: string;
  responsible: Person;
  assignees: Person[];
  progress: number;
  dueDate: string;
  priority: ProjectPriority;
  priorityLabel?: string;
  labels: string[];
  taskItems?: ProjectTask[];
  /** BFF task counts: `total` and `completed` include the archived (done) tasks, `taskItems` only lists the `active` ones. */
  tasks: {
    total: number;
    completed: number;
    active: number;
    archived: number;
  };
  permissions?: {
    canView?: boolean;
    canEdit?: boolean;
    canDuplicate?: boolean;
    canDelete?: boolean;
    canCreateTask?: boolean;
    canAssignMembers?: boolean;
    canClose?: boolean;
  };
  createdAt: string;
}
