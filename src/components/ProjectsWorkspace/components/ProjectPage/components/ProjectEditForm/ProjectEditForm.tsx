import React from 'react';
import { Button, DateField, DeleteGhostButton, MultiSelect, SelectField, TextArea, TextField } from '@mairie360/lib-components/primitives';
import { Check } from 'lucide-react';
import { NO_MARKUP_HINT, NO_MARKUP_PATTERN, reportMarkupValidity } from '@/lib/text-constraints';

import { EditedSection } from '../../../EditedSection';
import { changedProjectFields, PROJECT_FORM_SECTIONS, type ProjectEditFieldErrors } from '../../../../project-form-validation';
import type { FilterOption, ProjectFormState } from '@/lib/projectPageState';
import type { Project } from '@/types/project';

export interface ProjectEditFormProps {
  form: ProjectFormState;
  saving: boolean;
  /** Error to show, already filtered by the caller. */
  error?: string;
  /** Messages under the fields (MAIR-846). */
  fieldErrors?: ProjectEditFieldErrors;
  disabled: boolean;
  saveDisabled: boolean;
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  responsibleOptions: FilterOption[];
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  /** Groups the project can be moved to (MAIR-880), its current group included. */
  groupOptions?: FilterOption[];
  groupsError?: string;
  onChange: (patch: Partial<ProjectFormState>) => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  /** MAIR-1136 (C13): the saved project, to count the changes (« Enregistrer (n) ») and mark the sections. */
  initial?: ProjectFormState;
  /** MAIR-1136: « Supprimer » on the left (the deletion asks for its confirmation). */
  onDelete?: () => void;
}

/**
 * MAIR-846 (C7, Figma F5 5.6): the project fields only, in the « Modifier le projet » modal of the page. MAIR-1136
 * (C13, C16): one page in two sections, « L’essentiel » (Titre, Description, Groupe / Échéance) and « Organisation »
 * (Responsable / Priorité / Statut, Équipe / Étiquettes), then « Budget » (MAIR-1085: voted, committed), each marked « Modifié » once changed; « Enregistrer (n) »
 * counts the changed fields. The group is required and cannot be removed: once one is chosen, the select offers no
 * empty choice.
 */
export const ProjectEditForm = ({
  form, saving, error, fieldErrors = {}, disabled, saveDisabled, statusOptions, priorityOptions, responsibleOptions, memberOptions, labelOptions,
  groupOptions = [], groupsError, onChange, onCancel, onSubmit, initial = form, onDelete,
}: ProjectEditFormProps) => {
  const changed = changedProjectFields(form, initial);
  const modified = (section: keyof typeof PROJECT_FORM_SECTIONS) => changed.some((key) => (PROJECT_FORM_SECTIONS[section] as readonly string[]).includes(key));
  return (
    <form className="space-y-4" aria-label="Modifier le projet" aria-busy={saving} noValidate onSubmit={onSubmit}>
      {error && (
        <div role="alert" className="rounded-[var(--mairie-radius-m,8px)] border border-[var(--mairie-danger-border,#ffcecb)] bg-[var(--mairie-danger-surface,#ffebe9)] px-3 py-2 text-sm font-medium text-[var(--mairie-danger,#cf222e)]">
          {error}
        </div>
      )}
      {saving && <p role="status" className="text-sm text-[var(--mairie-text-muted)]">Enregistrement du projet…</p>}
      <fieldset disabled={disabled} className="min-w-0 space-y-6 border-0 p-0">
        <EditedSection title="L’essentiel" modified={modified('essential')}>
          <TextField id="detail-project-title" label="Titre" value={form.title} required pattern={NO_MARKUP_PATTERN} title={NO_MARKUP_HINT} error={fieldErrors.title} onChange={(event) => onChange({ title: event.target.value })} />
          <TextArea id="detail-project-description" label="Description" value={form.description} rows={4} title={NO_MARKUP_HINT} error={fieldErrors.description} onChange={(event) => { reportMarkupValidity(event.target); onChange({ description: event.target.value }); }} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              id="detail-project-group"
              label="Groupe"
              required
              value={form.groupId}
              options={groupOptions}
              placeholder={form.groupId ? null : 'Choisir un groupe'}
              hint="Tous les membres du groupe verront le projet. Seuls vos groupes sont proposés."
              error={fieldErrors.groupId || groupsError || undefined}
              onChange={(groupId) => onChange({ groupId })}
            />
            <DateField id="detail-project-due-date" label="Échéance" value={form.dueDate} required error={fieldErrors.dueDate} onChange={(event) => onChange({ dueDate: event.target.value })} />
          </div>
        </EditedSection>
        <EditedSection title="Organisation" modified={modified('organisation')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SelectField id="detail-project-responsible" label="Responsable" value={form.responsible} options={responsibleOptions} placeholder={null} error={fieldErrors.responsible} onChange={(responsible) => onChange({ responsible })} />
            <SelectField id="detail-project-priority" label="Priorité" value={form.priority} options={priorityOptions} placeholder={null} onChange={(priority) => onChange({ priority: priority as Project['priority'] })} />
            <SelectField id="detail-project-status" label="Statut" value={form.status} options={statusOptions} placeholder={null} onChange={(status) => onChange({ status: status as Project['status'] })} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MultiSelect id="detail-project-assignees" label="Équipe" value={form.assignees} options={memberOptions} onChange={(assignees) => onChange({ assignees })} />
            <MultiSelect id="detail-project-labels" label="Étiquettes" value={form.labels} options={labelOptions} onChange={(labels) => onChange({ labels })} />
          </div>
        </EditedSection>
        {/* MAIR-1085: amounts in euros; an empty field clears the budget. */}
        <EditedSection title="Budget" modified={modified('budget')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField id="detail-project-budget-voted" label="Budget voté (€)" inputMode="decimal" autoComplete="off" value={form.budgetVoted} hint="Laissez vide si le budget n’est pas encore voté." error={fieldErrors.budgetVoted} onChange={(event) => onChange({ budgetVoted: event.target.value })} />
            <TextField id="detail-project-budget-committed" label="Budget engagé (€)" inputMode="decimal" autoComplete="off" value={form.budgetCommitted} hint="Montant des commandes déjà passées." error={fieldErrors.budgetCommitted} onChange={(event) => onChange({ budgetCommitted: event.target.value })} />
          </div>
        </EditedSection>

        <div className="flex items-center justify-between gap-2 border-t border-[var(--mairie-border)] pt-4">
          <div>{onDelete && <DeleteGhostButton type="button" onClick={onDelete} />}</div>
          <div className="flex gap-2">
            <Button variant="outline" tone="neutral" label="Annuler" type="button" onClick={onCancel} />
            <Button variant="solid" tone="primary" icon={Check} label={`Enregistrer (${changed.length})`} type="submit" loading={saving} disabled={saveDisabled || changed.length === 0} />
          </div>
        </div>
      </fieldset>
    </form>
  );
};
