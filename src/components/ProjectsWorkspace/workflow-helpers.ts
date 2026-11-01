import { assertTemplate, WORKFLOW_UNVERIFIED, type ProjectWorkflowPort, type TaskStatusDefinition } from '../../lib/projectWorkflow';

export const workflowMessage = (error: unknown) => error instanceof Error ? error.message : WORKFLOW_UNVERIFIED;

export const copyStatuses = (statuses: TaskStatusDefinition[]) => statuses.map(status => ({ ...status }));

export async function readTemplates(port: ProjectWorkflowPort, signal: AbortSignal) {
  const templates = await port.readTemplates(signal);
  if (!Array.isArray(templates)) throw new Error(WORKFLOW_UNVERIFIED);
  templates.forEach(assertTemplate);
  if (new Set(templates.map(template => template.id)).size !== templates.length) throw new Error(WORKFLOW_UNVERIFIED);
  return templates;
}
