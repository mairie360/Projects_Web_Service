import { DateField, MultiSelect, TextArea, TextField, WarningAlert } from '@mairie360/lib-components/primitives';
import { NO_MARKUP_HINT, NO_MARKUP_PATTERN, TASK_DESCRIPTION_MAX_LENGTH, reportMarkupValidity } from '@/lib/text-constraints';
import { TASK_START_AFTER_DUE, taskStartAfterDue, type FilterOption, type TaskFormState } from '@/lib/projectPageState';
import { dueAfterProject, taskDelayLabel } from '../../../../task-board-model';

export interface TaskEssentialFieldsProps {
  form: TaskFormState;
  titleError?: string;
  /** Due date of the project: a task due after it gets « Après la fin du projet ». */
  projectDueDate: string;
  labelOptions: FilterOption[];
  titleRef?: React.Ref<HTMLInputElement>;
  onChange: (patch: Partial<TaskFormState>) => void;
}

/**
 * MAIR-1137 (C12, Figma F6 6.10): « L’essentiel » of a task — Titre (required), Description (optional, line breaks
 * kept), Début (MAIR-1087, at or before the due date), Échéance with the time left and the « Après la fin du projet »
 * alert, Étiquettes.
 */
export const TaskEssentialFields = ({ form, titleError, projectDueDate, labelOptions, titleRef, onChange }: TaskEssentialFieldsProps) => {
  const delay = taskDelayLabel(form.dueDate);
  return (
    <div className="grid gap-4">
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
      <TextArea
        id="task-sheet-description"
        label="Description"
        value={form.description ?? ''}
        placeholder="Précisions, livrables attendus…"
        rows={4}
        maxLength={TASK_DESCRIPTION_MAX_LENGTH}
        title={NO_MARKUP_HINT}
        onChange={(event) => { reportMarkupValidity(event.target); onChange({ description: event.target.value }); }}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DateField
          id="task-sheet-start-date"
          label="Début"
          value={form.startDate ?? ''}
          max={form.dueDate || undefined}
          error={taskStartAfterDue(form) ? TASK_START_AFTER_DUE : undefined}
          onChange={(event) => onChange({ startDate: event.target.value })}
        />
        <DateField id="task-sheet-due-date" label="Échéance" value={form.dueDate} min={form.startDate || undefined} hint={delay || undefined} onChange={(event) => onChange({ dueDate: event.target.value })} />
      </div>
      {dueAfterProject(form.dueDate, projectDueDate) && (
        <WarningAlert title="Après la fin du projet" description="Cette échéance tombe après celle du projet." />
      )}
      <MultiSelect id="task-sheet-labels" label="Étiquettes" value={form.labels} options={labelOptions} onChange={(labels) => onChange({ labels })} />
    </div>
  );
};
