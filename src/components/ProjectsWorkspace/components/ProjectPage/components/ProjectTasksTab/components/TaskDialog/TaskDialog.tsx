'use client';

import React from 'react';
import { Button, DeleteGhostButton, Modal } from '@mairie360/lib-components/primitives';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

import { EditedSection } from '@/components/ProjectsWorkspace/components/EditedSection';
import { taskToFormState } from '@/components/ProjectsWorkspace/components/ProjectTasksEditor';
import { taskStartAfterDue, type FilterOption, type TaskFormState } from '@/lib/projectPageState';
import type { ProjectTask } from '@/types/project';
import { TASK_TITLE_REQUIRED } from '../../../../use-detail-task-form';
import { TaskAttributionFields } from './components/TaskAttributionFields';
import { TaskEssentialFields } from './components/TaskEssentialFields';
import { TaskRecap } from './components/TaskRecap';

export const TASK_CREATION_STEPS = [{ label: 'L’essentiel' }, { label: 'Attribution' }, { label: 'Récapitulatif' }] as const;
const RECAP = TASK_CREATION_STEPS.length - 1;
export const TASK_ASSIGNEE_REQUIRED = 'Choisissez au moins un agent assigné à cette tâche.';

type TaskField = 'title' | 'description' | 'startDate' | 'dueDate' | 'labels' | 'assignees' | 'priority' | 'status';
const ESSENTIAL: readonly TaskField[] = ['title', 'description', 'startDate', 'dueDate', 'labels'];
const statusOf = (form: TaskFormState) => [form.statusId ?? '', form.status];
const fieldValue = (form: TaskFormState, field: TaskField) => JSON.stringify(field === 'status' ? statusOf(form) : form[field] ?? '');

/** MAIR-1137 (C13): the fields of the edit that differ from the saved task. */
export function changedTaskFields(form: TaskFormState, initial: TaskFormState): TaskField[] {
  return (['title', 'description', 'startDate', 'dueDate', 'labels', 'assignees', 'priority', 'status'] as const).filter((field) => fieldValue(form, field) !== fieldValue(initial, field));
}

export interface TaskDialogProps {
  open: boolean;
  /** The edited task; `null` for « Nouvelle tâche ». */
  task: ProjectTask | null;
  form: TaskFormState;
  titleError?: string;
  /** Write refusal, already filtered by the caller. */
  error?: string;
  saving: boolean;
  disabled: boolean;
  submitDisabled: boolean;
  projectDueDate: string;
  statusValue: string;
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  /** Active tasks each agent holds, for the assignee cards. */
  loads: ReadonlyMap<string, number>;
  onStatusChange: (value: string) => void;
  onChange: (patch: Partial<TaskFormState>) => void;
  onClose: () => void;
  /** Resolves `true` once the BFF saved the task; `continueAfter` opens a new creation (« Ajouter et continuer »). */
  onSubmit: (event: React.FormEvent<HTMLFormElement>, options?: { continueAfter?: boolean }) => Promise<boolean> | void;
  /** « Supprimer » of the edit (asks for a confirmation); absent without the right to delete the task. */
  onDelete?: () => void;
  /** Task creation notice (receipt to verify), shown in the creation. */
  children?: React.ReactNode;
}

/**
 * MAIR-1137 (C12, C13, C16, Figma F6 6.10 → 6.10c, 6.8): the task window, a lib Modal. A creation goes in three steps
 * (« L’essentiel », « Attribution », « Récapitulatif ») with « Créer une autre tâche ensuite »; an edit is one page of
 * two sections marked « Modifié », « Enregistrer (n) » and « Supprimer ». The board « + » keeps its inline quick add.
 */
export function TaskDialog({
  open, task, form, titleError, error, saving, disabled, submitDisabled, projectDueDate, statusValue, statusOptions, priorityOptions, memberOptions,
  labelOptions, loads, onStatusChange, onChange, onClose, onSubmit, onDelete, children,
}: TaskDialogProps) {
  const formId = React.useId();
  const titleRef = React.useRef<HTMLInputElement>(null);
  const [step, setStep] = React.useState(0);
  const [stepTitleError, setStepTitleError] = React.useState('');
  const [assigneeError, setAssigneeError] = React.useState('');
  const [continueAfter, setContinueAfter] = React.useState(false);
  const editing = task !== null;
  const readOnly = task?.permissions?.canEdit === false;
  const initial = React.useMemo(() => (task ? taskToFormState(task) : null), [task]);
  const changed = initial ? changedTaskFields(form, initial) : [];

  // Every opening starts at the first step, without the messages of the previous one (state adjusted while rendering).
  const openingKey = open ? task?.id ?? 'new' : '';
  const [shownKey, setShownKey] = React.useState(openingKey);
  if (shownKey !== openingKey) {
    setShownKey(openingKey);
    setStep(0);
    setStepTitleError('');
    setAssigneeError('');
  }

  const change = (patch: Partial<TaskFormState>) => {
    if (patch.title?.trim()) setStepTitleError('');
    if (patch.assignees?.length) setAssigneeError('');
    onChange(patch);
  };

  /** Forward only once the steps before are valid (Titre, then an agent); back always. */
  const goTo = (target: number) => {
    if (target > 0 && !form.title.trim()) {
      setStep(0);
      setStepTitleError(TASK_TITLE_REQUIRED);
      titleRef.current?.focus();
      return;
    }
    // MAIR-1087: the start date stays at or before the due date (the field says so).
    if (target > 0 && taskStartAfterDue(form)) {
      setStep(0);
      document.getElementById('task-sheet-start-date')?.focus();
      return;
    }
    if (target > 1 && !form.assignees.length) {
      setStep(1);
      setAssigneeError(TASK_ASSIGNEE_REQUIRED);
      return;
    }
    setStep(target);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    if (!editing && step < RECAP) {
      event.preventDefault();
      goTo(step + 1);
      return;
    }
    const saved = await onSubmit(event, { continueAfter: !editing && continueAfter });
    if (saved && continueAfter) setStep(0);
  };

  const essential = (
    <TaskEssentialFields form={form} titleError={titleError || stepTitleError} projectDueDate={projectDueDate} labelOptions={labelOptions} titleRef={titleRef} onChange={change} />
  );
  const attribution = (statusLabel: string) => (
    <TaskAttributionFields
      form={form}
      memberOptions={memberOptions}
      loads={loads}
      priorityOptions={priorityOptions}
      statusValue={statusValue}
      statusOptions={statusOptions}
      assigneeError={assigneeError}
      statusLabel={statusLabel}
      onChange={change}
      onStatusChange={onStatusChange}
    />
  );
  const lastStep = editing || step === RECAP;
  const submitLabel = editing ? `Enregistrer (${changed.length})` : !lastStep ? 'Suivant' : continueAfter ? 'Ajouter et continuer' : 'Ajouter la tâche';

  return (
    <Modal
      open={open}
      size="l"
      title={editing ? 'Modifier la tâche' : 'Nouvelle tâche'}
      closeLabel="Fermer la fenêtre de la tâche"
      closeOnBackdrop={!saving}
      initialFocusRef={titleRef}
      onClose={onClose}
      steps={editing ? undefined : TASK_CREATION_STEPS}
      currentStep={editing ? undefined : step}
      onStepChange={editing || disabled ? undefined : goTo}
      footerStart={editing
        ? (onDelete && <DeleteGhostButton type="button" disabled={disabled} onClick={onDelete} />)
        : (step > 0 && <Button variant="ghost" tone="neutral" icon={ArrowLeft} label="Précédent" type="button" disabled={saving} onClick={() => setStep(step - 1)} />)}
      footer={(
        <>
          <Button variant="outline" tone="neutral" label="Annuler" type="button" disabled={saving} onClick={onClose} />
          {!readOnly && (
            <Button
              label={submitLabel}
              icon={lastStep ? Check : ArrowRight}
              type="submit"
              form={formId}
              loading={saving}
              disabled={(lastStep && submitDisabled) || disabled || (editing && changed.length === 0)}
            />
          )}
        </>
      )}
    >
      <form id={formId} noValidate aria-label={editing ? 'Modifier une tâche' : 'Créer une tâche'} aria-busy={saving} onSubmit={(event) => void submit(event)} className="space-y-5">
        <fieldset disabled={disabled || readOnly} className="min-w-0 space-y-6 border-0 p-0">
          {editing ? (
            <>
              <EditedSection title="L’essentiel" modified={changed.some((field) => ESSENTIAL.includes(field))}>{essential}</EditedSection>
              <EditedSection title="Attribution" modified={changed.some((field) => !ESSENTIAL.includes(field))}>{attribution('État')}</EditedSection>
            </>
          ) : (
            <>
              <div hidden={step !== 0}>{essential}</div>
              <div hidden={step !== 1}>{attribution('Colonne de départ')}</div>
              {step === RECAP && (
                <TaskRecap form={form} memberOptions={memberOptions} priorityOptions={priorityOptions} statusValue={statusValue} statusOptions={statusOptions} continueAfter={continueAfter} onContinueChange={setContinueAfter} />
              )}
            </>
          )}
        </fieldset>
        {error && <p role="alert" className="text-sm font-medium text-[var(--mairie-error-text)] [overflow-wrap:anywhere]">{error}</p>}
        {saving && <p role="status" className="text-sm text-[var(--mairie-muted)]">Enregistrement de la tâche…</p>}
      </form>
      {!editing && children}
    </Modal>
  );
}
