'use client';

import { Button } from '@mairie360/lib-components/primitives';
import { NO_MARKUP_HINT, NO_MARKUP_PATTERN } from '@/lib/text-constraints';
import type { FilterOption, TaskFormState } from '@/lib/projectPageState';
import type { Project } from '@/types/project';
import { fieldClassName } from '../../../../field-style';
import { FieldLabel } from '../../../FieldLabel';
import { MultiSelectField } from '../../../MultiSelectField';
import { SelectField } from '../../../SelectField';

export function TaskDraftForm({
  form,
  dueDate,
  editing,
  error,
  responsible,
  memberOptions,
  labelOptions,
  statusOptions,
  priorityOptions,
  onChange,
  onSave,
  onCancel,
}: {
  form: Omit<TaskFormState, 'dueDate'>;
  dueDate: string;
  editing: boolean;
  error: string;
  responsible: string;
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  onChange: (patch: Partial<TaskFormState>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="border-b border-[#dedbd6] p-4">
      <div className="space-y-3">
        <input
          value={form.title}
          placeholder="Ajouter une tâche..."
          aria-label="Nouvelle tâche"
          pattern={NO_MARKUP_PATTERN}
          title={NO_MARKUP_HINT}
          className="h-10 w-full rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm text-[#24292f] outline-none transition placeholder:text-[#6e7781] focus:border-[#0969da] focus:bg-white focus:ring-2 focus:ring-[#0969da]/20"
          onChange={(event) => onChange({ title: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSave();
            }
          }}
        />

        {error && <p role="alert" className="text-xs font-medium text-[#cf222e]">{error}</p>}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SelectField
            id="project-form-task-status"
            label="Statut"
            value={form.status}
            options={statusOptions}
            onChange={(status) => onChange({ status: status as Project['status'] })}
          />
          <SelectField
            id="project-form-task-priority"
            label="Priorité"
            value={form.priority}
            options={priorityOptions}
            onChange={(priority) => onChange({ priority: priority as Project['priority'] })}
          />
          <div>
            <FieldLabel htmlFor="project-form-task-due-date" label="Échéance" />
            <input
              id="project-form-task-due-date"
              type="date"
              value={dueDate}
              className={fieldClassName}
              onChange={(event) => onChange({ dueDate: event.target.value })}
            />
          </div>
        </div>

        <MultiSelectField
          id="project-form-task-assignees"
          label="Assignés"
          values={form.assignees}
          options={memberOptions}
          placeholder="Choisir un ou plusieurs assignés"
          onChange={(assignees) => onChange({ assignees })}
        />

        {form.assignees.length === 0 && responsible && (
          <p className="text-xs text-[#57606a]">
            Sans choix, le responsable du projet sera assigné à cette tâche.
          </p>
        )}

        <MultiSelectField
          id="project-form-task-labels"
          label="Étiquettes"
          values={form.labels}
          options={labelOptions}
          placeholder="Choisir une ou plusieurs étiquettes"
          onChange={(labels) => onChange({ labels })}
        />

        <div className="flex justify-end gap-2">
          {editing && (
            <Button variant="outline" tone="neutral"
              label="Annuler"
              type="button"
              onClick={onCancel}
              className="!h-9 !min-h-0 !rounded-md !border-[#d0d7de] !bg-white !px-4 !text-sm !font-semibold !text-[#24292f] hover:!bg-[#eef1f4]"
            />
          )}
          <Button
            label={editing ? 'Enregistrer la tâche' : 'Ajouter la tâche'}
            type="button"
            onClick={onSave}
            className="!h-9 !min-h-0 !rounded-md !border-[#2da44e] !bg-[#2da44e] !px-4 !text-sm !font-semibold !text-white hover:!bg-[#2c974b]"
          />
        </div>
      </div>
    </div>
  );
}
