import type { ProjectFormState } from '@/lib/projectPageState';
import { FormField } from '@/components/ProjectsWorkspace/components/FormField';
import { TextAreaField } from '@/components/ProjectsWorkspace/components/TextAreaField';

export interface ProjectMainFieldsProps {
  form: ProjectFormState;
  onChange: (patch: Partial<ProjectFormState>) => void;
}

/** Title, then the description under its "Écrire" tab. */
export const ProjectMainFields = ({ form, onChange }: ProjectMainFieldsProps) => (
  <>
    <div className="rounded-md border border-[#d9d5d0] bg-[#fbfaf8] p-4">
      <FormField id="project-title" label="Titre" value={form.title} required placeholder="Ajouter un titre..." onChange={(title) => onChange({ title })} />
    </div>

    <div className="overflow-hidden rounded-md border border-[#d9d5d0] bg-[#fbfaf8]">
      <div className="flex h-10 items-center border-b border-[#dedbd6] bg-[#f1eee9] px-3">
        <span className="rounded-md border border-[#d0d7de] bg-white px-3 py-1 text-xs font-semibold text-[#24292f]">Écrire</span>
      </div>
      <div className="p-4">
        <TextAreaField
          id="project-description"
          label="Description"
          value={form.description}
          required
          placeholder="Ajouter une description, des critères d'acceptation ou des notes..."
          onChange={(description) => onChange({ description })}
        />
      </div>
    </div>
  </>
);
