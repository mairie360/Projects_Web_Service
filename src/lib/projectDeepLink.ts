export type ProjectDeepLink =
  | { projectId: string; taskId: string | null }
  | { error: string }
  | null;

/**
 * Public id of a linked project or task. Links built by the messaging carry the bare number (`?project=38&task=79`),
 * the Dashboard the public id (`project-38`): a bare number gets the prefix, `null` when it is not a positive one.
 * Any other value is kept as is, and BFF_Project refuses it if it names nothing.
 */
function publicId(prefix: 'project' | 'task', id: string): string | null {
  if (!/^\d+$/.test(id)) return id;
  const number = Number(id);
  return Number.isSafeInteger(number) && number > 0 ? `${prefix}-${number}` : null;
}

export function parseProjectDeepLink(search: string): ProjectDeepLink {
  const params = new URLSearchParams(search);
  if (!params.has('project') && !params.has('task')) return null;

  const projectIds = params.getAll('project');
  const taskIds = params.getAll('task');
  const projectId = projectIds[0]?.trim();
  const taskId = taskIds[0]?.trim() ?? null;

  if (projectIds.length !== 1 || !projectId || taskIds.length > 1 || (taskIds.length === 1 && !taskId)) {
    return { error: 'Lien de projet invalide.' };
  }

  const linkedProject = publicId('project', projectId);
  const linkedTask = taskId === null ? null : publicId('task', taskId);
  if (!linkedProject || (taskId !== null && !linkedTask)) return { error: 'Lien de projet invalide.' };
  return { projectId: linkedProject, taskId: linkedTask };
}

/** MAIR-846: tabs of the project page, kept in the URL (`?project=<id>&tab=<tab>`). */
export const PROJECT_TABS = ['overview', 'tasks', 'planning', 'team', 'documents', 'activity'] as const;
export type ProjectTab = (typeof PROJECT_TABS)[number];

/** Tab named by the URL; a linked task opens « Tâches », anything else « Vue d'ensemble ». */
export function projectTabFromSearch(search: string): ProjectTab {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  if (PROJECT_TABS.includes(tab as ProjectTab)) return tab as ProjectTab;
  return params.has('task') ? 'tasks' : 'overview';
}

/** Query string of the page with `projectId` open on `tab` (or the list when `projectId` is null); other parameters are kept. */
export function projectPageSearch(search: string, projectId: string | null, tab: ProjectTab = 'overview') {
  const params = new URLSearchParams(search);
  params.delete('project');
  params.delete('task');
  params.delete('tab');
  if (projectId) {
    params.set('project', projectId);
    if (tab !== 'overview') params.set('tab', tab);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Writes the project page into the browser history (no-op where there is none, e.g. server rendering). */
export function writeProjectLocation(projectId: string | null, tab: ProjectTab = 'overview', mode: 'push' | 'replace' = 'push') {
  if (typeof window === 'undefined' || !window.history || !window.location) return;
  const search = projectPageSearch(window.location.search ?? '', projectId, tab);
  if (search === (window.location.search ?? '')) return;
  const url = `${window.location.pathname ?? '/'}${search}${window.location.hash ?? ''}`;
  if (mode === 'push') window.history.pushState(window.history.state, '', url);
  else window.history.replaceState(window.history.state, '', url);
}
