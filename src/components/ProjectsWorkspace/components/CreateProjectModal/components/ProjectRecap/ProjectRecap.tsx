import { Button, DescriptionList, TagList } from '@mairie360/lib-components/primitives';
import { Pencil } from 'lucide-react';
import type { FilterOption, ProjectFormState } from '@/lib/projectPageState';
import type { ProjectTemplate } from '@/lib/projectWorkflow';
import { formatProjectDate } from '../../../../project-card-meta';

export interface ProjectRecapProps {
  form: ProjectFormState;
  template?: ProjectTemplate;
  memberOptions: FilterOption[];
  groupOptions: FilterOption[];
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  /** « Modifier » of a block: back to the step that holds its fields. */
  onEditStep: (step: number) => void;
}

const EMPTY = '—';
const labelOf = (options: FilterOption[], value: string) => options.find((option) => option.value === value)?.label ?? (value || EMPTY);

function RecapBlock({ title, step, items, onEditStep }: { title: string; step: number; items: { label: string; value: React.ReactNode }[]; onEditStep: (step: number) => void }) {
  return (
    <section aria-label={title} className="rounded-[var(--mairie-radius-m)] border border-[var(--mairie-border)] p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--mairie-text)]">{title}</h3>
        <Button variant="ghost" tone="neutral" size="s" icon={Pencil} label="Modifier" aria-label={`Modifier ${title}`} type="button" onClick={() => onEditStep(step)} />
      </div>
      <DescriptionList items={items} labelWidth={120} />
    </section>
  );
}

/** MAIR-1136 (C9, Figma F3): the last creation step, what will be created, block by block. */
export const ProjectRecap = ({ form, template, memberOptions, groupOptions, statusOptions, priorityOptions, onEditStep }: ProjectRecapProps) => {
  const team = form.assignees.map((id) => labelOf(memberOptions, id));
  return (
    <div className="grid gap-4">
      <RecapBlock
        title="L’essentiel"
        step={0}
        onEditStep={onEditStep}
        items={[
          { label: 'Titre', value: form.title.trim() || EMPTY },
          { label: 'Description', value: form.description.trim() || EMPTY },
          { label: 'Groupe', value: labelOf(groupOptions, form.groupId) },
          { label: 'Échéance', value: form.dueDate ? formatProjectDate(form.dueDate) : EMPTY },
        ]}
      />
      <RecapBlock
        title="Organisation"
        step={1}
        onEditStep={onEditStep}
        items={[
          { label: 'Responsable', value: labelOf(memberOptions, form.responsible) },
          { label: 'Priorité', value: labelOf(priorityOptions, form.priority) },
          { label: 'Statut', value: labelOf(statusOptions, form.status) },
          { label: 'Équipe', value: team.length > 0 ? team.join(', ') : EMPTY },
          { label: 'Étiquettes', value: form.labels.length > 0 ? <TagList label="Étiquettes du projet" items={form.labels} size="s" /> : EMPTY },
        ]}
      />
      <RecapBlock
        title="Tâches"
        step={2}
        onEditStep={onEditStep}
        items={[
          { label: 'Modèle', value: template?.name ?? 'Modèle par défaut' },
          { label: 'Tâches', value: form.taskItems.length > 0 ? form.taskItems.map((task) => task.title).join(', ') : 'Aucune tâche' },
        ]}
      />
    </div>
  );
};
