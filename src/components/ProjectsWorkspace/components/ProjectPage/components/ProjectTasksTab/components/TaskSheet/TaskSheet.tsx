'use client';

import React from 'react';
import { Button, DateField, Drawer, MultiSelect, SelectField, TextField } from '@mairie360/lib-components/primitives';
import { MessageSquare, Trash2 } from 'lucide-react';

import { NO_MARKUP_HINT, NO_MARKUP_PATTERN } from '@/lib/text-constraints';
import type { FilterOption, TaskFormState } from '@/lib/projectPageState';
import type { ProjectTask } from '@/types/project';
import type { TaskCollaborationState } from '@/components/ProjectsWorkspace/components/ProjectPage/use-task-collaboration';
import { TaskFollowUp } from './components/TaskFollowUp';

export interface TaskSheetProps {
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
  statusValue: string;
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  collaboration: TaskCollaborationState;
  onStatusChange: (value: string) => void;
  onChange: (patch: Partial<TaskFormState>) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  /** « Supprimer la tâche » (asks for a confirmation); absent without the right to delete it. */
  onDelete?: () => void;
  /** Task creation notice (receipt to verify), shown in the creation sheet. */
  children?: React.ReactNode;
}

/**
 * MAIR-859 (C4, C5, Figma F6 6.7–6.11): the task sheet in a lib Drawer (size m), for a new task or an existing one:
 * Titre (required), État (keyboard alternative to the drag and drop), Priorité, Assignée à, Échéance, Étiquettes,
 * then the follow-up (comments, history) and « Supprimer la tâche ». The published contract has no task description
 * nor start date: the sheet shows neither.
 */
export function TaskSheet({
  open, task, form, titleError, error, saving, disabled, submitDisabled, statusValue, statusOptions, priorityOptions, memberOptions, labelOptions,
  collaboration, onStatusChange, onChange, onClose, onSubmit, onDelete, children,
}: TaskSheetProps) {
  const formId = React.useId();
  const readOnly = task?.permissions?.canEdit === false;
  const followUpOpen = Boolean(task && collaboration.taskId === task.id);
  const titleRef = React.useRef<HTMLInputElement>(null);
  // The Drawer (a child, so its effect runs first) focuses its first control and remembers the opener; the title takes it then.
  React.useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  return (
    <Drawer
      open={open}
      size="m"
      title={task ? 'Modifier la tâche' : 'Nouvelle tâche'}
      closeLabel="Fermer la fiche de la tâche"
      onClose={onClose}
      footer={(
        <>
          {task && onDelete && (
            <Button variant="outline" tone="danger" icon={Trash2} label="Supprimer la tâche" type="button" className="mr-auto" disabled={disabled} onClick={onDelete} />
          )}
          <Button variant="outline" tone="neutral" label="Annuler" type="button" disabled={saving} onClick={onClose} />
          {!readOnly && (
            <Button label={task ? 'Enregistrer la tâche' : 'Ajouter la tâche'} type="submit" form={formId} loading={saving} disabled={submitDisabled || disabled} />
          )}
        </>
      )}
    >
      <form id={formId} noValidate aria-label={task ? 'Modifier une tâche' : 'Créer une tâche'} aria-busy={saving} onSubmit={onSubmit} className="space-y-4">
        <fieldset disabled={disabled || readOnly} className="min-w-0 space-y-4 border-0 p-0">
          <TextField
            id="task-sheet-title"
            label="Titre"
            ref={titleRef}
            required
            value={form.title}
            placeholder="Ex. Consulter les riverains"
            pattern={NO_MARKUP_PATTERN}
            title={NO_MARKUP_HINT}
            error={titleError}
            aria-invalid={titleError ? true : undefined}
            onChange={(event) => onChange({ title: event.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField id="task-sheet-status" label="État" value={statusValue} options={statusOptions} placeholder={null} onChange={onStatusChange} />
            <SelectField
              id="task-sheet-priority"
              label="Priorité"
              value={form.priority}
              options={priorityOptions.filter((option) => option.value !== 'all')}
              placeholder={null}
              onChange={(priority) => onChange({ priority: priority as TaskFormState['priority'] })}
            />
          </div>
          <MultiSelect id="task-sheet-assignees" label="Assignée à" value={form.assignees} options={memberOptions} onChange={(assignees) => onChange({ assignees })} />
          <DateField id="task-sheet-due-date" label="Échéance" value={form.dueDate} onChange={(event) => onChange({ dueDate: event.target.value })} />
          <MultiSelect id="task-sheet-labels" label="Étiquettes" value={form.labels} options={labelOptions} onChange={(labels) => onChange({ labels })} />
        </fieldset>
        {error && <p role="alert" className="text-sm font-medium text-[var(--mairie-error-text)] [overflow-wrap:anywhere]">{error}</p>}
        {saving && <p role="status" className="text-sm text-[var(--mairie-muted)]">Enregistrement de la tâche…</p>}
      </form>
      {!task && children}
      {task && (
        <section aria-label="Suivi de la tâche" className="mt-6 border-t border-[var(--mairie-border)] pt-4">
          <Button
            variant="ghost"
            tone="neutral"
            size="s"
            icon={MessageSquare}
            label={followUpOpen ? 'Masquer le suivi' : 'Suivi et commentaires'}
            aria-expanded={followUpOpen}
            type="button"
            onClick={() => void collaboration.open(task.id)}
          />
          {followUpOpen && (
            <TaskFollowUp
              taskTitle={task.title}
              loading={collaboration.loading}
              saving={collaboration.saving}
              error={collaboration.error}
              collaboration={collaboration.collaboration}
              canComment={task.permissions?.canComment !== false}
              message={collaboration.message}
              onMessageChange={collaboration.setMessage}
              onRefresh={collaboration.refresh}
              onSubmit={(event) => void collaboration.submit(event, task.id)}
            />
          )}
        </section>
      )}
    </Drawer>
  );
}
