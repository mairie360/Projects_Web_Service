export type ProjectDeepLink =
  | { projectId: string; taskId: string | null }
  | { error: string }
  | null;

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

  return { projectId, taskId };
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
