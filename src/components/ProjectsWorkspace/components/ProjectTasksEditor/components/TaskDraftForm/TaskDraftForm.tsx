'use client';

import { Button, DateField, MultiSelect, SelectField, TextField } from '@mairie360/lib-components/primitives';
import { NO_MARKUP_HINT, NO_MARKUP_PATTERN } from '@/lib/text-constraints';
import { taskStatusOf, type FilterOption, type TaskFormState } from '@/lib/projectPageState';
import type { Project } from '@/types/project';

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
        {/* MAIR-487 (RGAA 11.1, 10.7, 3.2): the lib field — visible label, visible focus, contrasted placeholder. */}
        <TextField
          id="project-form-task-title"
          label="Nouvelle tâche"
          value={form.title}
          placeholder="Ajouter une tâche..."
          pattern={NO_MARKUP_PATTERN}
          title={NO_MARKUP_HINT}
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
            options={statusOptions} placeholder={null}
            onChange={(status) => onChange({ status: taskStatusOf(status as Project['status']) })}
          />
          <SelectField
            id="project-form-task-priority"
            label="Priorité"
            value={form.priority}
            options={priorityOptions} placeholder={null}
            onChange={(priority) => onChange({ priority: priority as Project['priority'] })}
          />
          <DateField id="project-form-task-due-date" label="Échéance"
              value={dueDate}
              onChange={(event) => onChange({ dueDate: event.target.value })} />
        </div>

        <MultiSelect
          id="project-form-task-assignees"
          label="Assignés"
          value={form.assignees}
          options={memberOptions}
          onChange={(assignees) => onChange({ assignees })}
        />

        {form.assignees.length === 0 && responsible && (
          <p className="text-xs text-[#57606a]">
            Sans choix, le responsable du projet sera assigné à cette tâche.
          </p>
        )}

        <MultiSelect
          id="project-form-task-labels"
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
              onClick={onCancel}
            />
          )}
          <Button
            label={editing ? 'Enregistrer la tâche' : 'Ajouter la tâche'}
            type="button"
            onClick={onSave}
          />
        </div>
      </div>
    </div>
  );
}
