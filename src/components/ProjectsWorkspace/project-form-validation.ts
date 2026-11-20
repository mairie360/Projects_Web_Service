import type { ProjectFormState } from '@/lib/projectPageState';

export type ProjectFieldErrors = Partial<Record<'title' | 'description' | 'groupId' | 'responsible' | 'dueDate', string>>;

const MARKUP = /[<>]/;

/** Ids of the fields of the project page edit (MAIR-846), same order. */
export const PROJECT_EDIT_FIELD_IDS: Record<keyof ProjectFieldErrors, string> = {
  title: 'detail-project-title',
  description: 'detail-project-description',
  groupId: 'detail-project-group',
  responsible: 'detail-project-responsible',
  dueDate: 'detail-project-due-date',
};

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
export function validateProjectForm(form: ProjectFormState, { creating, groupCount, groupRequired = creating }: { creating: boolean; groupCount: number; groupRequired?: boolean }): ProjectFieldErrors {
  const errors: ProjectFieldErrors = {};
  if (!form.title.trim()) errors.title = 'Le titre est obligatoire.';
  else if (MARKUP.test(form.title)) errors.title = 'Le titre ne doit pas contenir les caractères < ou >.';
  if (MARKUP.test(form.description)) errors.description = 'La description ne doit pas contenir les caractères < ou >.';
  // MAIR-846 (C7): the page edit requires the group too (`groupRequired`) as soon as one can be chosen.
  if (groupRequired && !form.groupId && (creating ? groupCount !== 1 : groupCount > 0)) errors.groupId = 'Le groupe est obligatoire.';
  if (!form.responsible.trim() && form.assignees.length === 0) errors.responsible = 'Choisissez un responsable ou un membre de l’équipe.';
  if (!form.dueDate) errors.dueDate = 'La date d’échéance est obligatoire.';
  return errors;
}
