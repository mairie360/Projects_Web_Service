import { createTaskFormState } from './projectPageState';
import type { FilterOption } from './projectPageState';
import type { Project } from '../types/project';

export interface CurrentAgentSource { read: (signal: AbortSignal) => Promise<{ id: string } | null> }

// The project owner is not the authenticated agent. Never substitute the first member.
export function createDetailTaskFormState(project: Project, currentAgentId: string | null | undefined, members: FilterOption[]) {
  const state = createTaskFormState(project);
  const allowed = currentAgentId && members.some(member => String(member.value) === currentAgentId);
  return { ...state, assignees: allowed ? [currentAgentId] : [] };
}
