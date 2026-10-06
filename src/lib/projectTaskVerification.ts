import type { ProjectDetailsResponse } from './bffProjectClient';

export const TASK_VERIFICATION_MESSAGE = 'L’opération a été acceptée, mais sa confirmation de tâche est incohérente. Vérifiez la fiche sans répéter l’action.';

export class ProjectTaskVerificationRequiredError extends Error {
  constructor() {
    super(TASK_VERIFICATION_MESSAGE);
    this.name = 'ProjectTaskVerificationRequiredError';
  }
}

export function assertProjectDetailsIdentity(projectId: string, details: ProjectDetailsResponse) {
  const ids = details.taskItems.map(task => task.id);
  if (details.project.id !== projectId || ids.some(id => !id.trim()) || new Set(ids).size !== ids.length) {
    throw new Error('Les identifiants de la fiche reçue sont incohérents. Vérifiez la fiche sans répéter l’action.');
  }
}
