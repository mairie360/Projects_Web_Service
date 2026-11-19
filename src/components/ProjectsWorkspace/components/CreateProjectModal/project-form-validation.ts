import type { ProjectFormState } from '@/lib/projectPageState';

export type ProjectFieldErrors = Partial<Record<'title' | 'description' | 'groupId' | 'responsible' | 'dueDate', string>>;

const MARKUP = /[<>]/;

/** Field ids in the dialog order: the first one in error gets the focus (MAIR-836). */
export const PROJECT_FIELD_IDS: Record<keyof ProjectFieldErrors, string> = {
  title: 'project-title',
  description: 'project-description',
  groupId: 'project-group',
  responsible: 'project-responsible',
  dueDate: 'project-due-date',
};

/**
 * Messages shown under the fields of the project dialog (Figma F3 3.3) before anything is sent. The group is
 * required to create a project (MAIR-683), not to edit one created before groups; a single proposed group is
 * submitted by the controller even when the select was left untouched.
 */
export function validateProjectForm(form: ProjectFormState, { creating, groupCount }: { creating: boolean; groupCount: number }): ProjectFieldErrors {
  const errors: ProjectFieldErrors = {};
  if (!form.title.trim()) errors.title = 'Le titre est obligatoire.';
  else if (MARKUP.test(form.title)) errors.title = 'Le titre ne doit pas contenir les caractères < ou >.';
  if (MARKUP.test(form.description)) errors.description = 'La description ne doit pas contenir les caractères < ou >.';
  if (creating && !form.groupId && groupCount !== 1) errors.groupId = 'Le groupe est obligatoire.';
  if (!form.responsible.trim() && form.assignees.length === 0) errors.responsible = 'Choisissez un responsable ou un membre de l’équipe.';
  if (!form.dueDate) errors.dueDate = 'La date d’échéance est obligatoire.';
  return errors;
}
