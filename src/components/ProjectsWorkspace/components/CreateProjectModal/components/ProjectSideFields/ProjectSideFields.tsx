import React from 'react';
import { DateField, MultiSelect, SelectField, TextField } from '@mairie360/lib-components/primitives';
import { NO_MARKUP_HINT, NO_MARKUP_PATTERN } from '@/lib/text-constraints';
import type { FilterOption, ProjectFormState } from '@/lib/projectPageState';
import type { Project } from '@/types/project';
import type { ProjectFieldErrors } from '../../project-form-validation';

export interface ProjectSideFieldsProps {
  form: ProjectFormState;
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  responsibleOptions: FilterOption[];
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  /** Groups the project can be linked to (MAIR-880). */
  groupOptions?: FilterOption[];
  groupsError?: string;
  /** The group is required to create a project, optional to edit one created before groups. */
  groupRequired?: boolean;
  errors?: ProjectFieldErrors;
  onChange: (patch: Partial<ProjectFormState>) => void;
}

const GROUP_HINT = 'Tous les membres du groupe verront le projet. Seuls vos groupes sont proposés.';

/** Adds a label that is not proposed yet (MAIR-836 « création à la volée »): Entrée or « Ajouter ». */
function NewLabel({ labels, onAdd }: { labels: string[]; onAdd: (label: string) => void }) {
  const [draft, setDraft] = React.useState('');
  const value = draft.trim();
  const invalid = /[<>]/.test(value);
  const add = () => {
    if (!value || invalid) return;
    if (!labels.includes(value)) onAdd(value);
    setDraft('');
  };
  return (
    <TextField
      id="project-new-label"
      label="Nouvelle étiquette"
      size="s"
      value={draft}
      placeholder="Ajouter une étiquette…"
      pattern={NO_MARKUP_PATTERN}
      title={NO_MARKUP_HINT}
      hint="Entrée pour l’ajouter au projet."
      error={invalid ? 'Une étiquette ne doit pas contenir les caractères < ou >.' : undefined}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return;
        // Enter adds the label instead of submitting the dialog.
        event.preventDefault();
        add();
      }}
    />
  );
}

/** The fields under the description, in the Figma F3 order: Statut / Priorité / Groupe, Responsable / Échéance, Équipe / Étiquettes. */
export const ProjectSideFields = ({ form, statusOptions, priorityOptions, responsibleOptions, memberOptions, labelOptions, groupOptions = [], groupsError, groupRequired = true, errors = {}, onChange }: ProjectSideFieldsProps) => {
  // Labels typed on the fly are not in the page options yet: keep them selectable (and removable) as chips.
  const labels = [...labelOptions, ...form.labels.filter((label) => !labelOptions.some((option) => option.value === label)).map((label) => ({ value: label, label }))];
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField id="project-status" label="Statut" value={form.status} options={statusOptions} placeholder={null} onChange={(status) => onChange({ status: status as Project['status'] })} />
        <SelectField id="project-priority" label="Priorité" value={form.priority} options={priorityOptions} placeholder={null} onChange={(priority) => onChange({ priority: priority as Project['priority'] })} />
        <SelectField
          id="project-group"
          label="Groupe"
          required={groupRequired}
          value={form.groupId}
          options={groupOptions}
          placeholder="Choisir un groupe"
          hint={GROUP_HINT}
          error={errors.groupId || groupsError || undefined}
          onChange={(groupId) => onChange({ groupId })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField id="project-responsible" label="Responsable" value={form.responsible} options={responsibleOptions} placeholder={null} error={errors.responsible} onChange={(responsible) => onChange({ responsible })} />
        <DateField id="project-due-date" label="Échéance" value={form.dueDate} required error={errors.dueDate} onChange={(event) => onChange({ dueDate: event.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MultiSelect id="project-assignees" label="Équipe" value={form.assignees} options={memberOptions} visibleOptions={4} onChange={(assignees) => onChange({ assignees })} />
        <div className="space-y-2">
          <MultiSelect id="project-labels" label="Étiquettes" value={form.labels} options={labels} visibleOptions={4} onChange={(selected) => onChange({ labels: selected })} />
          <NewLabel labels={form.labels} onAdd={(label) => onChange({ labels: [...form.labels, label] })} />
        </div>
      </div>
    </>
  );
};
