import type {
  ActivityItem as ContractActivityItem,
  Milestone as ContractMilestone,
  ProjectMemberRole as ContractProjectMemberRole,
  ProjectPriority as ContractProjectPriority,
  ProjectStatus as ContractProjectStatus,
  TaskCollaborationResponse,
  TaskComment as ContractTaskComment,
  TaskHistoryEntry as ContractTaskHistoryEntry,
} from '@mairie360/bff-project-openapi/model';

export type ProjectStatus = ContractProjectStatus;
/** MAIR-1084: a task has three status categories; `review` and `on-hold` are project statuses only. */
export type TaskStatus = Exclude<ProjectStatus, 'review' | 'on-hold'>;
/** MAIR-1088: role of a member in the project (the owner always reads `manager`). */
export type ProjectMemberRole = ContractProjectMemberRole;
/** MAIR-1086: a milestone of the project (`dueDate` is a day, `YYYY-MM-DD`). */
export type Milestone = ContractMilestone;
/** MAIR-1089: an entry of the project activity (a project comment or the history of one of its tasks). */
export type ActivityItem = ContractActivityItem;
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
  /** MAIR-1087: start date (`YYYY-MM-DD` once normalized), `null` or absent without one. */
  startDate?: string | null;
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
  status: TaskStatus;
  statusId?: string;
  responsible: Person;
  assignees: Person[];
  priority: ProjectPriority;
  labels: string[];
  dueDate: string;
  /** MAIR-1087: start date (`YYYY-MM-DD`), empty for none. */
  startDate?: string;
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
  /** Group whose members see the project (MAIR-880); `null` for a project created before groups or whose group was deleted. */
  group?: { id: string; name: string } | null;
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
  /** MAIR-1088: members with their role (first 5 on the page, all of them with their load in the detail). */
  members?: ProjectMember[];
  /** MAIR-1088: role of the caller in the project, `null` when they are not a member. */
  myRole?: ProjectMemberRole | null;
  /** MAIR-1085: budgets in cents of euro, `null` when not filled in. */
  budgetVoted?: number | null;
  budgetCommitted?: number | null;
  /** MAIR-1086: the first 100 milestones (detail only) and their total. */
  milestones?: Milestone[];
  milestonesTotal?: number;
}

export interface ProjectMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: ProjectMemberRole;
  /** Detail only: active tasks of the project assigned to the member, and the open ones among them. */
  load?: { tasksOpen: number; tasksTotal: number };
}
