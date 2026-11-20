import React from 'react';
import { getBffProjectErrorMessage } from '@/lib/bffProjectClient';
import { projectToFormState, type ProjectFormState } from '@/lib/projectPageState';
import { ProjectReceiptVerificationRequiredError } from '@/lib/projectReceiptVerification';
import type { Project } from '@/types/project';
import { PROJECT_EDIT_FIELD_IDS, validateProjectForm, type ProjectFieldErrors } from '../../project-form-validation';

// One project write at a time: the project form and the task form share this lockRef.
export type MutationLock = React.MutableRefObject<{ project: boolean; task: boolean }>;

export function useProjectEdit({ project, lockRef, dialogRef, verificationBlocked, groupCount = 0, onUpdateProject }: {
  project: Project;
  lockRef: MutationLock;
  /** Element focused once the edit closes (the page title since MAIR-846). */
  dialogRef: React.RefObject<HTMLElement | null>;
  /** Groups the project may be linked to: with at least one, the group is required (MAIR-846, C7). */
  groupCount?: number;
  verificationBlocked: boolean;
  onUpdateProject: (projectId: string, form: ProjectFormState) => void | Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<ProjectFormState>(() => projectToFormState(project));
  const [error, setError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<ProjectFieldErrors>({});
  const [verificationError, setVerificationError] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const projectIdRef = React.useRef(project.id);
  const editingRef = React.useRef(false);
  const busy = () => lockRef.current.project || lockRef.current.task;

  // Official refreshes update defaults, never an active same-project draft.
  const syncProject = (next: Project) => {
    if (projectIdRef.current !== next.id || !editingRef.current) {
      projectIdRef.current = next.id;
      editingRef.current = false;
      setForm(projectToFormState(next));
      setError('');
      setFieldErrors({});
      setEditing(false);
    }
  };

  const update = (patch: Partial<ProjectFormState>) => {
    if (lockRef.current.project) return;
    setForm((current) => ({ ...current, ...patch }));
    if (error) setError('');
    // A corrected field loses its message at once; a team member satisfies « Responsable » as well.
    const touched = [...Object.keys(patch), ...('assignees' in patch ? ['responsible'] : [])];
    setFieldErrors((current) => touched.some((key) => key in current)
      ? Object.fromEntries(Object.entries(current).filter(([key]) => !touched.includes(key)))
      : current);
  };

  const cancel = () => {
    if (busy()) return;
    // Keep keyboard navigation in the detail before its focused form disappears.
    dialogRef.current?.focus({ preventScroll: true });
    setForm(projectToFormState(project));
    setError('');
    setFieldErrors({});
    editingRef.current = false;
    setEditing(false);
  };

  const toggle = () => {
    if (busy()) return;
    if (editingRef.current) {
      cancel();
    } else {
      setForm(projectToFormState(project));
      setError('');
      setFieldErrors({});
      editingRef.current = true;
      setEditing(true);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy() || verificationBlocked) return;
    setVerificationError(false);

    // MAIR-846 (C7): messages under the fields, focus on the first one in error, nothing sent.
    const errors = validateProjectForm(form, { creating: false, groupCount, groupRequired: true });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const first = (Object.keys(PROJECT_EDIT_FIELD_IDS) as (keyof ProjectFieldErrors)[]).find((key) => errors[key]);
      if (first && typeof document !== 'undefined') document.getElementById(PROJECT_EDIT_FIELD_IDS[first])?.focus();
      return;
    }

    lockRef.current.project = true;
    setSaving(true);
    setError('');
    try {
      await onUpdateProject(project.id, form);
      dialogRef.current?.focus({ preventScroll: true });
      editingRef.current = false;
      setEditing(false);
    } catch (error) {
      setVerificationError(error instanceof ProjectReceiptVerificationRequiredError);
      setError(getBffProjectErrorMessage(error));
    } finally {
      lockRef.current.project = false;
      setSaving(false);
    }
  };

  return { editing, form, error, fieldErrors, verificationError, saving, syncProject, update, cancel, toggle, submit };
}
