import { TextArea, TextField } from '@mairie360/lib-components/primitives';
import { NO_MARKUP_HINT, NO_MARKUP_PATTERN, reportMarkupValidity } from '@/lib/text-constraints';
import type { ProjectFormState } from '@/lib/projectPageState';
import type { ProjectFieldErrors } from '../../../../project-form-validation';

export interface ProjectMainFieldsProps {
  form: ProjectFormState;
  errors?: ProjectFieldErrors;
  onChange: (patch: Partial<ProjectFormState>) => void;
}

/** Title (required) and description (Figma F3 3.2). */
export const ProjectMainFields = ({ form, errors = {}, onChange }: ProjectMainFieldsProps) => (
  <>
    <TextField
      id="project-title"
      label="Titre"
      value={form.title}
      required
      placeholder="Ex. Rénovation de l’école Jules-Ferry"
      pattern={NO_MARKUP_PATTERN}
      title={NO_MARKUP_HINT}
      error={errors.title}
      onChange={(event) => onChange({ title: event.target.value })}
    />
    <TextArea
      id="project-description"
      label="Description"
      value={form.description}
      placeholder="Objectifs, périmètre, contraintes…"
      rows={4}
      title={NO_MARKUP_HINT}
      error={errors.description}
      onChange={(event) => { reportMarkupValidity(event.target); onChange({ description: event.target.value }); }}
    />
  </>
);
