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
