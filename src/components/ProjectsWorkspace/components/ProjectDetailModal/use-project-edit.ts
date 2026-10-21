import React from 'react';
import { getBffProjectErrorMessage } from '@/lib/bffProjectClient';
import { projectToFormState, type ProjectFormState } from '@/lib/projectPageState';
import { ProjectReceiptVerificationRequiredError } from '@/lib/projectReceiptVerification';
import type { Project } from '@/types/project';

// One project write at a time: the project form and the task form share this lockRef.
export type MutationLock = React.MutableRefObject<{ project: boolean; task: boolean }>;

export function useProjectEdit({ project, lockRef, dialogRef, verificationBlocked, onUpdateProject }: {
  project: Project;
  lockRef: MutationLock;
  dialogRef: React.RefObject<HTMLElement | null>;
  verificationBlocked: boolean;
  onUpdateProject: (projectId: string, form: ProjectFormState) => void | Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<ProjectFormState>(() => projectToFormState(project));
  const [error, setError] = React.useState('');
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
      setEditing(false);
    }
  };

  const update = (patch: Partial<ProjectFormState>) => {
    if (lockRef.current.project) return;
    setForm((current) => ({ ...current, ...patch }));
    if (error) setError('');
  };

  const cancel = () => {
    if (busy()) return;
    // Keep keyboard navigation in the detail before its focused form disappears.
    dialogRef.current?.focus({ preventScroll: true });
    setForm(projectToFormState(project));
    setError('');
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
      editingRef.current = true;
      setEditing(true);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy() || verificationBlocked) return;
    setVerificationError(false);

    const title = form.title.trim();
    const description = form.description.trim();
    const dueDate = form.dueDate;

    if (!title || !description || !dueDate) {
      setError('Les champs obligatoires doivent être renseignés.');
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

  return { editing, form, error, verificationError, saving, syncProject, update, cancel, toggle, submit };
}
