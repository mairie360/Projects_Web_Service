import { AlertCircle, CheckCircle2, Clock, Eye } from 'lucide-react';

export type ProjectStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type ProjectPriority = 'high' | 'medium' | 'low';

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

export interface TaskComment {
  id: string;
  message: string;
  author: { id: string; name: string };
  createdAt: string;
}

export interface TaskHistoryEntry {
  id: string;
  action: string;
  label: string;
  author: { id: string; name: string };
  createdAt: string;
  changes?: Record<string, unknown>;
}

export interface TaskCollaboration {
  comments: TaskComment[];
  history: TaskHistoryEntry[];
}

export interface ProjectTaskDraft {
  title: string;
  status: ProjectStatus;
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
  tasks: {
    total: number;
    completed: number;
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

export const statusConfig = {
  'todo': {
    label: 'À faire',
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-300'
  },
  'in-progress': {
    label: 'En cours',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-[#1256a6]',
    bg: 'bg-[#d4e8e7]',
    border: 'border-[#1256a6]'
  },
  'review': {
    label: 'En révision',
    icon: <Eye className="h-4 w-4" />,
    color: 'text-[#1256a6]',
    bg: 'bg-[#d4e8e7]',
    border: 'border-[#1256a6]'
  },
  'done': {
    label: 'Terminé',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-300'
  }
};

export const priorityConfig = {
  'high': { label: 'Haute', color: 'text-[#c53030]', bg: 'bg-red-50', border: 'border-[#c53030]' },
  'medium': { label: 'Moyenne', color: 'text-[#4b908d]', bg: 'bg-[#d4e8e7]', border: 'border-[#4b908d]' },
  'low': { label: 'Basse', color: 'text-[#6b6b6b]', bg: 'bg-[#e8e6e3]', border: 'border-[#d9d5d0]' }
};

export const labelColors = [
  'bg-[#1256a6] text-white',
  'bg-[#4b908d] text-white',
  'bg-[#3c3c3c] text-white',
  'bg-[#6aada9] text-white',
  'bg-[#c53030] text-white',
  'bg-[#0d3d6f] text-white'
];
