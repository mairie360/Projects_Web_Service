import { Checkbox, DescriptionList, TagList } from '@mairie360/lib-components/primitives';
import type { FilterOption, TaskFormState } from '@/lib/projectPageState';
import { formatProjectDate } from '@/components/ProjectsWorkspace/project-card-meta';

export interface TaskRecapProps {
  form: TaskFormState;
  memberOptions: FilterOption[];
  priorityOptions: FilterOption[];
  statusValue: string;
  statusOptions: FilterOption[];
  continueAfter: boolean;
  onContinueChange: (value: boolean) => void;
}

const labelOf = (options: FilterOption[], value: string) => options.find((option) => String(option.value) === value)?.label ?? (value || '—');

/** MAIR-1137 (C12, Figma F6 6.10c): the last creation step and « Créer une autre tâche ensuite ». */
export const TaskRecap = ({ form, memberOptions, priorityOptions, statusValue, statusOptions, continueAfter, onContinueChange }: TaskRecapProps) => (
  <div className="grid gap-4">
    <DescriptionList
      labelWidth={120}
      items={[
        { label: 'Titre', value: form.title.trim() || '—' },
        {
          label: 'Description',
          value: form.description?.trim()
            ? <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{form.description}</span>
            : <span className="text-[var(--mairie-text-muted)]">Non renseignée</span>,
        },
        { label: 'Début', value: form.startDate ? formatProjectDate(form.startDate) : '—' },
        { label: 'Échéance', value: form.dueDate ? formatProjectDate(form.dueDate) : '—' },
        { label: 'Étiquettes', value: form.labels.length ? <TagList label="Étiquettes de la tâche" items={form.labels} size="s" /> : '—' },
        { label: 'Assignée à', value: form.assignees.length ? form.assignees.map((value) => labelOf(memberOptions, value)).join(', ') : '—' },
        { label: 'Priorité', value: labelOf(priorityOptions, form.priority) },
        { label: 'État', value: labelOf(statusOptions, statusValue) },
      ]}
    />
    <Checkbox label="Créer une autre tâche ensuite" checked={continueAfter} onChange={(event) => onContinueChange(event.target.checked)} />
  </div>
);
