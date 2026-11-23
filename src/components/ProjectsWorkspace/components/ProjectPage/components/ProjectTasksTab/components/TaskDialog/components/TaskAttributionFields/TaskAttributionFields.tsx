import { Avatar, RadioGroup } from '@mairie360/lib-components/primitives';
import type { FilterOption, TaskFormState } from '@/lib/projectPageState';

export interface TaskAttributionFieldsProps {
  form: TaskFormState;
  memberOptions: FilterOption[];
  /** Active tasks each agent holds (option value → count). */
  loads: ReadonlyMap<string, number>;
  priorityOptions: FilterOption[];
  statusValue: string;
  statusOptions: FilterOption[];
  /** « Assignée à » refused (no agent chosen). */
  assigneeError?: string;
  /** The creation names the state « Colonne de départ », the edit « État ». */
  statusLabel?: string;
  onChange: (patch: Partial<TaskFormState>) => void;
  onStatusChange: (value: string) => void;
}

/** MAIR-1137 (C12): one help sentence per priority, under its card. */
export const PRIORITY_HINTS: Record<string, string> = {
  high: 'À traiter avant le reste : elle bloque ou a une échéance proche.',
  medium: 'Dans le cours normal du travail.',
  low: 'Quand le reste est fait.',
};

const loadLabel = (count: number) => (count === 0 ? 'Aucune tâche en cours' : `${count} tâche${count > 1 ? 's' : ''} en cours`);

/**
 * MAIR-1137 (C12, Figma F6 6.10b): « Attribution » of a task as lib RadioGroup cards — the agent (with their load), the
 * priority (with a help sentence) and the state (the starting column at the creation).
 */
export const TaskAttributionFields = ({ form, memberOptions, loads, priorityOptions, statusValue, statusOptions, assigneeError, statusLabel = 'État', onChange, onStatusChange }: TaskAttributionFieldsProps) => (
  <div className="grid gap-5">
    <RadioGroup
      label="Assignée à"
      name="task-assignee"
      variant="card"
      required
      value={form.assignees[0] ?? ''}
      error={assigneeError}
      options={memberOptions.map((member) => ({
        value: String(member.value),
        label: member.label,
        leading: <Avatar alt={String(member.label)} size="s" />,
        hint: loadLabel(loads.get(String(member.value)) ?? 0),
      }))}
      onChange={(value) => onChange({ assignees: [value] })}
    />
    <RadioGroup
      label="Priorité"
      name="task-priority"
      variant="card"
      inline
      value={form.priority}
      options={priorityOptions.filter((option) => option.value !== 'all').map((option) => ({ value: String(option.value), label: option.label, hint: PRIORITY_HINTS[String(option.value)] }))}
      onChange={(priority) => onChange({ priority: priority as TaskFormState['priority'] })}
    />
    <RadioGroup
      label={statusLabel}
      name="task-status"
      variant="card"
      inline
      value={statusValue}
      options={statusOptions.filter((option) => option.value !== '').map((option) => ({ value: String(option.value), label: option.label }))}
      onChange={onStatusChange}
    />
  </div>
);
