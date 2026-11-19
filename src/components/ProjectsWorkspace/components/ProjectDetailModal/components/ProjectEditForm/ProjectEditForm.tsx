import React from 'react';
import { Button, DateField, MultiSelect, SelectField, TextArea, TextField } from '@mairie360/lib-components/primitives';
import { NO_MARKUP_HINT, NO_MARKUP_PATTERN, reportMarkupValidity } from '@/lib/text-constraints';

import type { FilterOption, ProjectFormState } from '@/lib/projectPageState';
import type { Project } from '@/types/project';

export interface ProjectEditFormProps {
  form: ProjectFormState;
  saving: boolean;
  /** Error to show, already filtered by the caller. */
  error?: string;
  disabled: boolean;
  saveDisabled: boolean;
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  responsibleOptions: FilterOption[];
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  /** Groups the project can be moved to (MAIR-880). */
  groupOptions?: FilterOption[];
  groupsError?: string;
  onChange: (patch: Partial<ProjectFormState>) => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

/** Inline project edition in the side column; the tasks stay visible. */
export const ProjectEditForm = ({
  form, saving, error, disabled, saveDisabled, statusOptions, priorityOptions, responsibleOptions, memberOptions, labelOptions,
  groupOptions = [], groupsError, onChange, onCancel, onSubmit,
}: ProjectEditFormProps) => (
  <form className="space-y-4" aria-label="Modifier le projet" aria-busy={saving} onSubmit={onSubmit}>
    <div>
      <h3 className="text-sm font-semibold text-[#24292f]">Modifier le projet</h3>
      <p className="mt-1 text-xs text-[#57606a]">Les tâches restent visibles pendant l’édition.</p>
    </div>

    {error && (
      <div role="alert" className="rounded-md border border-[#ffcecb] bg-[#ffebe9] px-3 py-2 text-xs font-medium text-[#cf222e]">
        {error}
      </div>
    )}
    {saving && <p role="status" className="text-xs text-[#57606a]">Enregistrement du projet…</p>}
    <fieldset disabled={disabled} className="min-w-0 space-y-4 border-0 p-0">
      <TextField id="detail-project-title" label="Titre" value={form.title} required placeholder="Ajouter un titre..." pattern={NO_MARKUP_PATTERN} title={NO_MARKUP_HINT} onChange={(event) => onChange({ title: event.target.value })} />
      <TextArea id="detail-project-description" label="Description" value={form.description} required placeholder="Ajouter une description..." rows={8} title={NO_MARKUP_HINT} onChange={(event) => { reportMarkupValidity(event.target); onChange({ description: event.target.value }); }} />
      <SelectField
        id="detail-project-group"
        label="Groupe"
        required={false}
        value={form.groupId}
        options={groupOptions}
        placeholder="Choisir un groupe"
        hint="Les membres du groupe voient le projet."
        error={groupsError || undefined}
        onChange={(groupId) => onChange({ groupId })}
      />
      <SelectField id="detail-project-status" label="Statut" value={form.status} options={statusOptions} placeholder={null} onChange={(status) => onChange({ status: status as Project['status'] })} />
      <SelectField id="detail-project-priority" label="Priorité" value={form.priority} options={priorityOptions} placeholder={null} onChange={(priority) => onChange({ priority: priority as Project['priority'] })} />
      <SelectField id="detail-project-responsible" label="Assigné principal" value={form.responsible} options={responsibleOptions} placeholder={null} onChange={(responsible) => onChange({ responsible })} />
      <MultiSelect id="detail-project-assignees" label="Assignés" value={form.assignees} options={memberOptions} onChange={(assignees) => onChange({ assignees })} />
      <MultiSelect id="detail-project-labels" label="Étiquettes" value={form.labels} options={labelOptions} onChange={(labels) => onChange({ labels })} />
      <DateField id="detail-project-due-date" label="Échéance"
          value={form.dueDate}
          required
          onChange={(event) => onChange({ dueDate: event.target.value })} />

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" tone="neutral"
          label="Annuler"
          type="button"
          onClick={onCancel}
          className="!h-9 !min-h-0 !rounded-md !border-[#d0d7de] !bg-white !px-4 !text-sm !font-semibold !text-[#24292f] hover:!bg-[#eef1f4]"
        />
        <Button
          label="Enregistrer"
          type="submit"
          disabled={saveDisabled}
          className="!h-9 !min-h-0 !rounded-md !border-[#2da44e] !bg-[#2da44e] !px-4 !text-sm !font-semibold !text-white hover:!bg-[#2c974b]"
        />
      </div>
    </fieldset>
  </form>
);
