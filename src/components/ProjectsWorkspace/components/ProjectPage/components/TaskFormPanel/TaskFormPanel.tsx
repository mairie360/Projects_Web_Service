import React from 'react';
import { Button, DateField, MultiSelect, SelectField } from '@mairie360/lib-components/primitives';
import { CircleDot } from 'lucide-react';

import { NO_MARKUP_HINT, NO_MARKUP_PATTERN } from '@/lib/text-constraints';
import type { FilterOption, TaskFormState } from '@/lib/projectPageState';

export interface TaskFormPanelProps {
  form: TaskFormState;
  editing: boolean;
  saving: boolean;
  /** Error to show, already filtered by the caller. */
  error?: string;
  disabled: boolean;
  submitDisabled: boolean;
  statusValue: string;
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  onStatusChange: (value: string) => void;
  onChange: (patch: Partial<TaskFormState>) => void;
  onCancelEdit: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  /** Rendered under the form (task creation notice). */
  children?: React.ReactNode;
}

/** "Ajouter une tâche" / "Modifier la tâche" form of the detail panel. */
export const TaskFormPanel = ({
  form, editing, saving, error, disabled, submitDisabled, statusValue, statusOptions, priorityOptions, memberOptions, labelOptions,
  onStatusChange, onChange, onCancelEdit, onSubmit, children,
}: TaskFormPanelProps) => (
  <div className="mb-5 rounded-md border border-[#d9d5d0] bg-[#fbfaf8] p-4">
    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#24292f]">
      <CircleDot className="h-4 w-4 text-[#1a7f37]" strokeWidth={2} />
      {editing ? 'Modifier la tâche' : 'Ajouter une tâche'}
    </div>

    <form className="space-y-3" aria-label={editing ? 'Modifier une tâche' : 'Créer une tâche'} aria-busy={saving} onSubmit={onSubmit}>
      <fieldset disabled={disabled} className="min-w-0 space-y-3 border-0 p-0">
        <input
          value={form.title}
          placeholder="Ajouter une tâche..."
          aria-label="Titre de la tâche"
          pattern={NO_MARKUP_PATTERN}
          title={NO_MARKUP_HINT}
          className="h-10 w-full rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm text-[#24292f] outline-none transition placeholder:text-[#6e7781] focus:border-[#0969da] focus:bg-white focus:ring-2 focus:ring-[#0969da]/20"
          onChange={(event) => onChange({ title: event.target.value })}
        />

        {error && <p role="alert" className="text-xs font-medium text-[#cf222e]">{error}</p>}
        {saving && <p role="status" className="text-xs text-[#57606a]">Enregistrement de la tâche…</p>}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <SelectField id="detail-task-status" label="Statut" value={statusValue} options={statusOptions} placeholder={null} onChange={onStatusChange} />
          <SelectField
            id="detail-task-priority"
            label="Priorité"
            value={form.priority}
            options={priorityOptions} placeholder={null}
            onChange={(priority) => onChange({ priority: priority as TaskFormState['priority'] })}
          />
          <DateField id="detail-task-due-date" label="Échéance"
              value={form.dueDate}
              onChange={(event) => onChange({ dueDate: event.target.value })} />
        </div>

        <MultiSelect
          id="detail-task-assignees"
          label="Assignés"
          value={form.assignees}
          options={memberOptions}
          onChange={(assignees) => onChange({ assignees })}
        />

        <MultiSelect
          id="detail-task-labels"
          label="Étiquettes"
          value={form.labels}
          options={labelOptions}
          onChange={(labels) => onChange({ labels })}
        />

        <div className="flex justify-end gap-2">
          {editing && (
            <Button variant="outline" tone="neutral"
              label="Annuler"
              type="button"
              onClick={onCancelEdit}
              className="!h-9 !min-h-0 !rounded-md !border-[#d0d7de] !bg-white !px-4 !text-sm !font-semibold !text-[#24292f] hover:!bg-[#eef1f4]"
            />
          )}
          <Button
            label={editing ? 'Enregistrer la tâche' : 'Ajouter la tâche'}
            type="submit"
            disabled={submitDisabled}
            className="!h-9 !min-h-0 !rounded-md !border-[#2da44e] !bg-[#2da44e] !px-4 !text-sm !font-semibold !text-white hover:!bg-[#2c974b] disabled:!cursor-not-allowed disabled:!opacity-50"
          />
        </div>
      </fieldset>
    </form>
    {children}
  </div>
);
