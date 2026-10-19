import type { CreateProjectBody, ProjectDetailsResponse } from './bffProjectClient';

// Frontend view models. A future adapter must map published operations to this
// port; these types deliberately do not prescribe an HTTP resource or payload.
export type TaskStatusCategory = 'todo' | 'inprogress' | 'done';
export type TaskStatusDefinition = { id: string; name: string; color: string; category: TaskStatusCategory; taskCount?: number };
export type WorkflowTask = { id: string; title: string; statusId: string; canUpdateStatus: boolean };
export type ProjectWorkflowSnapshot = { projectId: string; revision: string; statuses: TaskStatusDefinition[]; tasks: WorkflowTask[]; draftStatusIds?: Record<string, string> };
export type ProjectTemplate = { id: string; revision: string; name: string; statuses: TaskStatusDefinition[] };
export type StatusMigration = { from: string; to: string };
/** Active tasks the caller already read with the project detail, so the port does not read it again. */
export type LoadedWorkflowTask = { id: string; title: string; statusId?: string; permissions?: { canUpdateStatus?: boolean } };
export type ProjectWorkflowPort = {
  readProject: (projectId: string, signal: AbortSignal, loaded?: { tasks: readonly LoadedWorkflowTask[] }) => Promise<ProjectWorkflowSnapshot>;
  /** The project's statuses alone, for forms that only choose a status. */
  readStatuses?: (projectId: string, signal: AbortSignal) => Promise<TaskStatusDefinition[]>;
  readTemplates: (signal: AbortSignal) => Promise<ProjectTemplate[]>;
  saveProjectStatuses?: (draft: { projectId: string; revision: string; statuses: TaskStatusDefinition[]; migrations: StatusMigration[] }, signal: AbortSignal) => Promise<ProjectWorkflowSnapshot>;
  moveTask?: (draft: { projectId: string; revision: string; taskId: string; statusId: string }, signal: AbortSignal) => Promise<ProjectWorkflowSnapshot>;
  saveTemplate?: (draft: { id?: string; revision?: string; name: string; statuses: TaskStatusDefinition[] }, signal: AbortSignal) => Promise<ProjectTemplate>;
  createProjectFromTemplate?: (template: Pick<ProjectTemplate, 'id' | 'revision'>, body: CreateProjectBody) => Promise<ProjectDetailsResponse>;
};

/** A workflow write refused before dispatch (MAIR-570): nothing was sent, so nothing needs verification. */
export class WorkflowWriteRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowWriteRefusedError';
  }
}
export const WORKFLOW_STATUS_SAVE_PENDING = 'Les statuts du projet sont en cours d’enregistrement. Réessayez après leur confirmation.';
export const WORKFLOW_TASK_WRITE_PENDING = 'Une modification de tâche est en cours sur ce projet. Réessayez après sa confirmation.';
export const WORKFLOW_TASKS_UNVERIFIED = 'Des tâches de ce projet sont à vérifier. Relisez la fiche avant de modifier les statuts.';
export const WORKFLOW_UNAVAILABLE = 'La configuration des statuts et des modèles est indisponible avec le service actuellement connecté.';
export const WORKFLOW_UNVERIFIED = 'La modification n’a pas pu être vérifiée. Relisez les données avant toute nouvelle écriture.';
export const categoryLabels: Record<TaskStatusCategory, string> = { todo: 'À faire', inprogress: 'En cours', done: 'Terminé' };
export const canManageWorkflow = (role?: string) => role === 'Admin' || role === 'Responsable';

export function validStatuses(statuses: TaskStatusDefinition[]): boolean {
  return Array.isArray(statuses) && statuses.length > 0 && statuses.length <= 30 && statuses.every(status => status &&
    typeof status.id === 'string' && !!status.id.trim() && typeof status.name === 'string' && !!status.name.trim() && !/[<>]/.test(status.name) && status.name.length <= 100 &&
    /^#[a-f\d]{6}$/i.test(status.color) && Object.hasOwn(categoryLabels, status.category)) &&
    new Set(statuses.map(status => status.id)).size === statuses.length &&
    new Set(statuses.map(status => status.name.trim().toLocaleLowerCase('fr'))).size === statuses.length;
}
export function validTemplateStatuses(statuses: TaskStatusDefinition[]) {
  return validStatuses(statuses) && Object.keys(categoryLabels).every(category => statuses.some(status => status.category === category));
}
export function assertWorkflowSnapshot(value: ProjectWorkflowSnapshot, projectId: string): void {
  if (!value || value.projectId !== projectId || typeof value.revision !== 'string' || !value.revision || !validStatuses(value.statuses) ||
    !Array.isArray(value.tasks) || value.tasks.some(task => !task || typeof task.id !== 'string' || !task.id || typeof task.title !== 'string' ||
      typeof task.canUpdateStatus !== 'boolean' || !value.statuses.some(status => status.id === task.statusId)) || new Set(value.tasks.map(task => task.id)).size !== value.tasks.length) {
    throw new Error(WORKFLOW_UNVERIFIED);
  }
}
export function assertTemplate(template: ProjectTemplate): void {
  if (!template || !template.id || typeof template.id !== 'string' || !template.revision || typeof template.revision !== 'string' ||
    typeof template.name !== 'string' || !template.name.trim() || template.name.length > 100 || !validStatuses(template.statuses)) throw new Error(WORKFLOW_UNVERIFIED);
}
export function sameStatuses(left: TaskStatusDefinition[], right: TaskStatusDefinition[], ignoreIds = false) {
  return left.length === right.length && left.every((status, index) => {
    const other = right[index];
    return (ignoreIds || status.id === other.id) && status.name === other.name && status.color.toLowerCase() === other.color.toLowerCase() && status.category === other.category;
  });
}
