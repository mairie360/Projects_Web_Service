import { DateField, MultiSelect, ProgressMeter, SelectField } from '@mairie360/lib-components/primitives';
import type { FilterOption, ProjectFormState } from '@/lib/projectPageState';
import type { Project } from '@/types/project';


export interface ProjectSideFieldsProps {
  form: ProjectFormState;
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  responsibleOptions: FilterOption[];
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  onChange: (patch: Partial<ProjectFormState>) => void;
}

const TaskCount = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-md border border-[#d9d5d0] bg-white px-3 py-2">
    <div className="text-xs font-semibold text-[#57606a]">{label}</div>
    <div className="mt-1 text-lg font-semibold text-[#24292f]">{value}</div>
  </div>
);

/** "Champs du projet": status, priority, people, labels, due date, progress and task counts. */
export const ProjectSideFields = ({ form, statusOptions, priorityOptions, responsibleOptions, memberOptions, labelOptions, onChange }: ProjectSideFieldsProps) => (
  <>
    <div>
      <h3 className="text-sm font-semibold text-[#24292f]">Champs du projet</h3>
      <p className="mt-1 text-xs text-[#57606a]">Configure les champs visibles sur les cartes.</p>
    </div>

    <SelectField id="project-status" label="Statut" value={form.status} options={statusOptions} placeholder={null} onChange={(status) => onChange({ status: status as Project['status'] })} />
    <SelectField id="project-priority" label="Priorité" value={form.priority} options={priorityOptions} placeholder={null} onChange={(priority) => onChange({ priority: priority as Project['priority'] })} />
    <SelectField id="project-responsible" label="Assigné principal" value={form.responsible} options={responsibleOptions} placeholder={null} onChange={(responsible) => onChange({ responsible })} />
    <MultiSelect id="project-assignees" label="Assignés" value={form.assignees} options={memberOptions} onChange={(assignees) => onChange({ assignees })} />
    <MultiSelect id="project-labels" label="Étiquettes" value={form.labels} options={labelOptions} onChange={(labels) => onChange({ labels })} />

    <DateField id="project-due-date" label="Échéance" value={form.dueDate} required onChange={(event) => onChange({ dueDate: event.target.value })} />

    <div>
      <h3 className="mb-2 text-sm font-semibold text-[#24292f]">Progression</h3>
      <ProgressMeter label="Progression" value={form.progress} />
    </div>

    <div className="grid grid-cols-2 gap-3">
      <TaskCount label="Terminées" value={form.completedTasks} />
      <TaskCount label="Total" value={form.totalTasks} />
    </div>
  </>
);
