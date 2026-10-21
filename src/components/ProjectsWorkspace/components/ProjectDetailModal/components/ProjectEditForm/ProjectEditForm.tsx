import React from 'react';
import { Button } from '@mairie360/lib-components/primitives';

import type { FilterOption, ProjectFormState } from '@/lib/projectPageState';
import type { Project } from '@/types/project';
import { FieldLabel } from '@/components/ProjectsWorkspace/components/FieldLabel';
import { FormField } from '@/components/ProjectsWorkspace/components/FormField';
import { MultiSelectField } from '@/components/ProjectsWorkspace/components/MultiSelectField';
import { SelectField } from '@/components/ProjectsWorkspace/components/SelectField';
import { TextAreaField } from '@/components/ProjectsWorkspace/components/TextAreaField';
import { fieldClassName } from '@/components/ProjectsWorkspace/field-style';

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
  onChange: (patch: Partial<ProjectFormState>) => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

/** Inline project edition in the side column; the tasks stay visible. */
export const ProjectEditForm = ({
  form, saving, error, disabled, saveDisabled, statusOptions, priorityOptions, responsibleOptions, memberOptions, labelOptions,
  onChange, onCancel, onSubmit,
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
      <FormField id="detail-project-title" label="Titre" value={form.title} required placeholder="Ajouter un titre..." onChange={(title) => onChange({ title })} />
      <TextAreaField id="detail-project-description" label="Description" value={form.description} required placeholder="Ajouter une description..." onChange={(description) => onChange({ description })} />
      <SelectField id="detail-project-status" label="Statut" value={form.status} options={statusOptions} onChange={(status) => onChange({ status: status as Project['status'] })} />
      <SelectField id="detail-project-priority" label="Priorité" value={form.priority} options={priorityOptions} onChange={(priority) => onChange({ priority: priority as Project['priority'] })} />
      <SelectField id="detail-project-responsible" label="Assigné principal" value={form.responsible} options={responsibleOptions} onChange={(responsible) => onChange({ responsible })} />
      <MultiSelectField id="detail-project-assignees" label="Assignés" values={form.assignees} options={memberOptions} placeholder="Choisir un ou plusieurs assignés" onChange={(assignees) => onChange({ assignees })} />
      <MultiSelectField id="detail-project-labels" label="Étiquettes" values={form.labels} options={labelOptions} placeholder="Choisir une ou plusieurs étiquettes" onChange={(labels) => onChange({ labels })} />
      <div>
        <FieldLabel htmlFor="detail-project-due-date" label="Échéance" required />
        <input
          id="detail-project-due-date"
          type="date"
          value={form.dueDate}
          required
          className={fieldClassName}
          onChange={(event) => onChange({ dueDate: event.target.value })}
        />
      </div>

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
