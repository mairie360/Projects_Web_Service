import type { FilterOption, ProjectFormState } from '../../../lib/projectPageState';
import type { Project } from '../../../types/project';
import { ProgressMeter } from '../../ProjectCard';
import { FieldLabel, MultiSelectField, SelectField, fieldClassName } from '../ProjectFormControls';

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

    <SelectField id="project-status" label="Statut" value={form.status} options={statusOptions} onChange={(status) => onChange({ status: status as Project['status'] })} />
    <SelectField id="project-priority" label="Priorité" value={form.priority} options={priorityOptions} onChange={(priority) => onChange({ priority: priority as Project['priority'] })} />
    <SelectField id="project-responsible" label="Assigné principal" value={form.responsible} options={responsibleOptions} onChange={(responsible) => onChange({ responsible })} />
    <MultiSelectField id="project-assignees" label="Assignés" values={form.assignees} options={memberOptions} placeholder="Choisir un ou plusieurs assignés" onChange={(assignees) => onChange({ assignees })} />
    <MultiSelectField id="project-labels" label="Étiquettes" values={form.labels} options={labelOptions} placeholder="Choisir une ou plusieurs étiquettes" onChange={(labels) => onChange({ labels })} />

    <div>
      <FieldLabel htmlFor="project-due-date" label="Échéance" required />
      <input id="project-due-date" type="date" value={form.dueDate} required className={fieldClassName} onChange={(event) => onChange({ dueDate: event.target.value })} />
    </div>

    <div>
      <h3 className="mb-2 text-sm font-semibold text-[#24292f]">Progression</h3>
      <ProgressMeter value={form.progress} />
    </div>

    <div className="grid grid-cols-2 gap-3">
      <TaskCount label="Terminées" value={form.completedTasks} />
      <TaskCount label="Total" value={form.totalTasks} />
    </div>
  </>
);
