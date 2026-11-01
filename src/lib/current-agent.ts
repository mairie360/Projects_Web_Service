import { sessionFetch } from '@mairie360/lib-components/browser';
import { createTaskFormState } from './projectPageState';
import type { FilterOption } from './projectPageState';
import type { Project } from '../types/project';

export interface CurrentAgentSource { read: (signal: AbortSignal) => Promise<{ id: string; namespace?: 'user' } | null> }

/** User /me exposes the Core ID; Project's published member IDs use user-{id}.
 * Return only an unambiguous value actually received in Project's options. */
export function selectableCurrentAgent(agent: Awaited<ReturnType<CurrentAgentSource['read']>>, members: FilterOption[]) {
  if (!agent || typeof agent.id !== 'string' || !agent.id.trim()) return null;
  if (agent.namespace === 'user' && (!/^[1-9]\d*$/.test(agent.id) || !Number.isSafeInteger(Number(agent.id)))) return null;
  const value = agent.namespace === 'user' ? `user-${agent.id}` : agent.id;
  const matches = members.filter(member => String(member.value) === value);
  return matches.length === 1 ? String(matches[0].value) : null;
}

/** Optional frontend lookup through Login's existing published /me relay. */
export const loginCurrentAgentSource: CurrentAgentSource = {
  async read(signal) {
    const response = await sessionFetch('/api/auth/current-user', { credentials: 'same-origin', cache: 'no-store', redirect: 'manual', signal });
    signal.throwIfAborted();
    if (!response.ok || response.status !== 200 || response.type === 'opaqueredirect') return null;
    const body: unknown = await response.json();
    signal.throwIfAborted();
    if (!body || typeof body !== 'object' || !('id' in body) || typeof body.id !== 'string') return null;
    return { id: body.id, namespace: 'user' };
  },
};

// The project owner is not the authenticated agent. Never substitute the first member.
export function createDetailTaskFormState(project: Project, currentAgentId: string | null | undefined, members: FilterOption[]) {
  const state = createTaskFormState(project);
  const allowed = currentAgentId && members.some(member => String(member.value) === currentAgentId);
  return { ...state, assignees: allowed ? [currentAgentId] : [] };
}
