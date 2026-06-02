'use client';

import React, { useMemo, useState } from 'react';
import { Alert, Button, Footer, Header, Sidebar, ToolTip } from '@mairie360/lib-components';
import {
  CalendarDays,
  Check,
  CheckSquare2,
  ChevronDown,
  CircleDot,
  Grid3X3,
  Kanban,
  List,
  ListChecks,
  PencilLine,
  Plus,
  Search,
  Settings,
  Square,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { KanbanBoard } from '../components/Kanban';
import {
  formatProjectDate,
  PersonAvatar,
  PriorityPill,
  ProgressMeter,
  ProjectCard,
  ProjectActionsMenu,
  StatusPill,
} from '../components/ProjectCard';
import { mockProjects, type Project, type ProjectTask, type ProjectTaskDraft } from '../types/project';

type ViewMode = 'kanban' | 'grid' | 'table';

type FilterOption = {
  label: string;
  value: string;
};

type ProjectFormState = {
  title: string;
  description: string;
  status: Project['status'];
  priority: Project['priority'];
  responsible: string;
  assignees: string[];
  labels: string[];
  dueDate: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  taskItems: ProjectTask[];
};

type TaskFormState = {
  title: string;
  status: Project['status'];
  priority: Project['priority'];
  assignees: string[];
  labels: string[];
  dueDate: string;
};

const statusOptions: FilterOption[] = [
  { label: 'Tous les statuts', value: 'all' },
  { label: 'À faire', value: 'todo' },
  { label: 'En cours', value: 'in-progress' },
  { label: 'En révision', value: 'review' },
  { label: 'Terminé', value: 'done' },
];

const priorityOptions: FilterOption[] = [
  { label: 'Toutes les priorités', value: 'all' },
  { label: 'Haute', value: 'high' },
  { label: 'Moyenne', value: 'medium' },
  { label: 'Basse', value: 'low' },
];

const viewOptions: { value: ViewMode; label: string; icon: LucideIcon }[] = [
  { value: 'kanban', label: 'Kanban', icon: Kanban },
  { value: 'grid', label: 'Grille', icon: Grid3X3 },
  { value: 'table', label: 'Table', icon: List },
];

const projectStatusOptions = statusOptions.filter((option) => option.value !== 'all');
const projectPriorityOptions = priorityOptions.filter((option) => option.value !== 'all');
const defaultProjectMembers = [
  'Alex Moreau',
  'Jean Dupont',
  'Marie Dubois',
  'Pierre Martin',
  'Sophie Leroy',
  'Thomas Bernard',
];
const defaultProjectLabels = [
  'Administration',
  'Archives',
  'Communication',
  'Énergie',
  'Environnement',
  'Espaces verts',
  'Infrastructure',
  'Loisirs',
  'Numérique',
  'Travaux',
  'Urgent',
  'Voirie',
];

function getUniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'fr')
  );
}

function createSelectOptions(values: string[]): FilterOption[] {
  return getUniqueValues(values).map((value) => ({ label: value, value }));
}

const generatedTaskTitles = [
  'Cadrer le besoin avec les services',
  'Préparer le dossier administratif',
  'Valider le budget prévisionnel',
  'Consulter les prestataires',
  'Planifier les interventions',
  'Informer les habitants',
  'Contrôler les livrables',
  'Rédiger le compte rendu',
  'Mettre à jour le planning',
  'Archiver les documents',
];

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDateWithOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return formatInputDate(date);
}

function createProjectFormState(status: Project['status'] = 'todo'): ProjectFormState {
  return {
    title: '',
    description: '',
    status,
    priority: 'medium',
    responsible: '',
    assignees: [],
    labels: [],
    dueDate: getDateWithOffset(30),
    progress: 0,
    totalTasks: 0,
    completedTasks: 0,
    taskItems: [],
  };
}

function createTaskFormState(project: Project): TaskFormState {
  return {
    title: '',
    status: project.status,
    priority: project.priority,
    assignees: [project.responsible.name],
    labels: [],
    dueDate: project.dueDate,
  };
}

function createInitialTaskItems(project: Project): ProjectTask[] {
  if (project.taskItems) return project.taskItems;

  return Array.from({ length: project.tasks.total }, (_, index) => {
    const completed = index < project.tasks.completed;
    const assignee = project.assignees[index % Math.max(project.assignees.length, 1)] ?? project.responsible;

    return {
      id: `${project.id}-task-${index + 1}`,
      title: generatedTaskTitles[index % generatedTaskTitles.length],
      status: completed ? 'done' : project.status === 'done' ? 'todo' : project.status,
      responsible: { name: assignee.name },
      assignees: [{ name: assignee.name }],
      priority: project.priority,
      labels: project.labels.slice(0, Math.min(project.labels.length, 2)),
      dueDate: project.dueDate,
      completed,
      createdAt: project.createdAt,
    };
  });
}

function calculateProjectProgress(tasks: ProjectTask[]) {
  if (tasks.length === 0) return 0;

  return Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100);
}

function projectToFormState(project: Project): ProjectFormState {
  const responsibleName = project.responsible.name;
  const participantNames = getUniqueValues(project.assignees.map((assignee) => assignee.name));

  return {
    title: project.title,
    description: project.description,
    status: project.status,
    priority: project.priority,
    responsible: responsibleName,
    assignees: participantNames,
    labels: project.labels,
    dueDate: project.dueDate,
    progress: project.progress,
    totalTasks: project.tasks.total,
    completedTasks: project.tasks.completed,
    taskItems: createInitialTaskItems(project),
  };
}

function ActionButton({
  label,
  icon: Icon,
  primary = false,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <span className="relative inline-flex">
      <Icon
        className={`pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 ${
          primary ? 'text-white' : 'text-[#2f3438]'
        }`}
        strokeWidth={2}
      />
      <Button
        label={label}
        primary={primary ? true : undefined}
        onClick={onClick}
        className={`!h-10 !min-h-0 !rounded-md !pl-10 !pr-4 !text-sm !font-semibold ${
          primary
            ? '!border-[#1256a6] !bg-[#1256a6] !text-white hover:!bg-[#0f4b92]'
            : '!border-[#d9d5d0] !bg-white !text-[#2f3438] hover:!border-[#b9d6d5] hover:!bg-[#fafafa]'
        }`}
      />
    </span>
  );
}

function FieldLabel({ htmlFor, label, required = false }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-semibold text-[#57606a]">
      {label}
      {required && <span className="ml-1 text-[#cf222e]">*</span>}
    </label>
  );
}

const fieldClassName =
  'mt-2 h-9 w-full rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm text-[#24292f] shadow-sm outline-none transition placeholder:text-[#6e7781] focus:border-[#0969da] focus:bg-white focus:ring-2 focus:ring-[#0969da]/20';

function FormField({
  id,
  label,
  value,
  required = false,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} required={required} />
      <input
        id={id}
        value={value}
        required={required}
        placeholder={placeholder}
        className={fieldClassName}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  value,
  required = false,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} required={required} />
      <textarea
        id={id}
        value={value}
        required={required}
        rows={8}
        placeholder={placeholder}
        className={`${fieldClassName} h-auto resize-none py-2`}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  required = false,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} required={required} />
      <select
        id={id}
        value={value}
        required={required}
        className={fieldClassName}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function MultiSelectField({
  id,
  label,
  values,
  options,
  placeholder = 'Sélectionner...',
  onChange,
}: {
  id: string;
  label: string;
  values: string[];
  options: FilterOption[];
  placeholder?: string;
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const selectedOptions = options.filter((option) => values.includes(option.value));

  React.useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (fieldRef.current && !fieldRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((currentValue) => currentValue !== value));
      return;
    }

    onChange([...values, value]);
  };

  const removeValue = (value: string) => {
    onChange(values.filter((currentValue) => currentValue !== value));
  };

  return (
    <div ref={fieldRef}>
      <FieldLabel htmlFor={id} label={label} />
      <div className="relative">
        <button
          id={id}
          type="button"
          className="mt-2 flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 py-2 text-left text-sm text-[#24292f] shadow-sm transition hover:bg-white focus-visible:border-[#0969da] focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da]/20"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span className={selectedOptions.length > 0 ? 'text-[#24292f]' : 'text-[#6e7781]'}>
            {selectedOptions.length > 0 ? `${selectedOptions.length} sélectionné(s)` : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#57606a]" strokeWidth={1.8} />
        </button>

        {open && (
          <div
            className="absolute left-0 top-[calc(100%+6px)] z-[90] max-h-60 w-full overflow-y-auto rounded-md border border-[#d0d7de] bg-white py-1 shadow-[0_8px_24px_rgba(140,149,159,0.24)]"
            role="listbox"
            aria-multiselectable="true"
            aria-label={label}
          >
            {options.map((option) => {
              const selected = values.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="flex min-h-9 w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#24292f] transition hover:bg-[#f6f8fa]"
                  onClick={() => toggleValue(option.value)}
                >
                  <span
                    className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      selected
                        ? 'border-[#0969da] bg-[#0969da] text-white'
                        : 'border-[#d0d7de] bg-white text-transparent'
                    }`}
                  >
                    <Check className="h-3 w-3" strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedOptions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#d0d7de] bg-white px-2 py-1 text-xs font-medium text-[#24292f]"
            >
              <span className="truncate">{option.label}</span>
              <button
                type="button"
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[#57606a] hover:bg-[#d8dee4] hover:text-[#24292f]"
                aria-label={`Retirer ${option.label}`}
                onClick={() => removeValue(option.value)}
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskEditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-[#0969da] bg-[#ddf4ff] px-3 text-xs font-semibold text-[#0969da] shadow-sm transition hover:border-[#0550ae] hover:bg-[#b6e3ff] hover:text-[#0550ae] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da]/30"
      onClick={onClick}
    >
      <PencilLine className="h-3.5 w-3.5" strokeWidth={2} />
      Modifier
    </button>
  );
}

function createTaskSummaryPatch(taskItems: ProjectTask[]): Pick<ProjectFormState, 'taskItems' | 'totalTasks' | 'completedTasks' | 'progress'> {
  const completedTasks = taskItems.filter((task) => task.completed).length;

  return {
    taskItems,
    totalTasks: taskItems.length,
    completedTasks,
    progress: calculateProjectProgress(taskItems),
  };
}

function createTaskFormStateFromProjectForm(form: ProjectFormState, memberOptions: FilterOption[]): TaskFormState {
  return {
    title: '',
    status: form.status,
    priority: form.priority,
    assignees: form.responsible ? [form.responsible] : memberOptions[0]?.value ? [memberOptions[0].value] : [],
    labels: [],
    dueDate: form.dueDate,
  };
}

function taskToFormState(task: ProjectTask): TaskFormState {
  const assigneeNames = task.assignees?.length
    ? task.assignees.map((assignee) => assignee.name)
    : [task.responsible.name];

  return {
    title: task.title,
    status: task.status,
    priority: task.priority,
    assignees: getUniqueValues(assigneeNames),
    labels: task.labels,
    dueDate: task.dueDate,
  };
}

function ProjectTasksEditor({
  form,
  memberOptions,
  labelOptions,
  onChange,
}: {
  form: ProjectFormState;
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  onChange: (patch: Partial<ProjectFormState>) => void;
}) {
  const [taskForm, setTaskForm] = React.useState<TaskFormState>(() =>
    createTaskFormStateFromProjectForm(form, memberOptions)
  );
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [taskFormError, setTaskFormError] = React.useState('');

  React.useEffect(() => {
    setTaskForm((current) => ({
      ...current,
      status: current.title ? current.status : form.status,
      priority: current.title ? current.priority : form.priority,
      assignees:
        current.assignees.length > 0
          ? current.assignees
          : form.responsible
            ? [form.responsible]
            : memberOptions[0]?.value
              ? [memberOptions[0].value]
              : [],
      dueDate: current.dueDate || form.dueDate,
    }));
  }, [form.dueDate, form.priority, form.responsible, form.status, memberOptions]);

  const updateTaskForm = (patch: Partial<TaskFormState>) => {
    setTaskForm((current) => ({ ...current, ...patch }));
    if (taskFormError) setTaskFormError('');
  };

  const updateTasks = (taskItems: ProjectTask[]) => {
    onChange(createTaskSummaryPatch(taskItems));
  };

  const saveTask = () => {
    const title = taskForm.title.trim();
    if (!title) {
      setTaskFormError('Le titre de la tâche est obligatoire.');
      return;
    }

    const assigneeNames = getUniqueValues(
      taskForm.assignees.length > 0 ? taskForm.assignees : [form.responsible || memberOptions[0]?.value || 'Non assigné']
    );
    const responsibleName = assigneeNames[0] || 'Non assigné';
    const task: ProjectTask = {
      id: editingTaskId ?? `task-${Date.now()}`,
      title,
      status: taskForm.status,
      responsible: { name: responsibleName },
      assignees: assigneeNames.map((name) => ({ name })),
      priority: taskForm.priority,
      labels: taskForm.labels,
      dueDate: taskForm.dueDate,
      completed: taskForm.status === 'done',
      createdAt: formatInputDate(new Date()),
    };

    updateTasks(
      editingTaskId
        ? form.taskItems.map((currentTask) =>
            currentTask.id === editingTaskId ? { ...task, createdAt: currentTask.createdAt } : currentTask
          )
        : [...form.taskItems, task]
    );
    setTaskForm({
      ...taskForm,
      title: '',
      assignees: form.responsible ? [form.responsible] : memberOptions[0]?.value ? [memberOptions[0].value] : [],
      labels: [],
    });
    setEditingTaskId(null);
    setTaskFormError('');
  };

  const editTask = (task: ProjectTask) => {
    setEditingTaskId(task.id);
    setTaskForm(taskToFormState(task));
    setTaskFormError('');
  };

  const cancelTaskEdit = () => {
    setEditingTaskId(null);
    setTaskForm(createTaskFormStateFromProjectForm(form, memberOptions));
    setTaskFormError('');
  };

  const toggleTask = (taskId: string) => {
    updateTasks(
      form.taskItems.map((task) => {
        if (task.id !== taskId) return task;

        const completed = !task.completed;

        return {
          ...task,
          completed,
          status: (completed ? 'done' : 'todo') as Project['status'],
        };
      })
    );
  };

  return (
    <section className="overflow-hidden rounded-md border border-[#d0d7de] bg-white">
      <div className="flex items-center justify-between border-b border-[#d8dee4] bg-[#f6f8fa] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#24292f]">
          <ListChecks className="h-4 w-4 text-[#57606a]" strokeWidth={1.8} />
          Tâches
        </div>
        <span className="text-xs font-medium text-[#57606a]">
          {form.completedTasks}/{form.totalTasks}
        </span>
      </div>

      <div className="border-b border-[#d8dee4] p-4">
        <div className="space-y-3">
          <input
            value={taskForm.title}
            placeholder="Ajouter une tâche..."
            className="h-10 w-full rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm text-[#24292f] outline-none transition placeholder:text-[#6e7781] focus:border-[#0969da] focus:bg-white focus:ring-2 focus:ring-[#0969da]/20"
            onChange={(event) => updateTaskForm({ title: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                saveTask();
              }
            }}
          />

          {taskFormError && <p className="text-xs font-medium text-[#cf222e]">{taskFormError}</p>}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SelectField
              id="project-form-task-status"
              label="Statut"
              value={taskForm.status}
              options={projectStatusOptions}
              onChange={(status) => updateTaskForm({ status: status as Project['status'] })}
            />
            <SelectField
              id="project-form-task-priority"
              label="Priorité"
              value={taskForm.priority}
              options={projectPriorityOptions}
              onChange={(priority) => updateTaskForm({ priority: priority as Project['priority'] })}
            />
            <div>
              <FieldLabel htmlFor="project-form-task-due-date" label="Échéance" />
              <input
                id="project-form-task-due-date"
                type="date"
                value={taskForm.dueDate}
                className={fieldClassName}
                onChange={(event) => updateTaskForm({ dueDate: event.target.value })}
              />
            </div>
          </div>

          <MultiSelectField
            id="project-form-task-assignees"
            label="Assignés"
            values={taskForm.assignees}
            options={memberOptions}
            placeholder="Choisir un ou plusieurs assignés"
            onChange={(assignees) => updateTaskForm({ assignees })}
          />

          <MultiSelectField
            id="project-form-task-labels"
            label="Étiquettes"
            values={taskForm.labels}
            options={labelOptions}
            placeholder="Choisir une ou plusieurs étiquettes"
            onChange={(labels) => updateTaskForm({ labels })}
          />

          <div className="flex justify-end gap-2">
            {editingTaskId && (
              <Button
                label="Annuler"
                type="button"
                onClick={cancelTaskEdit}
                className="!h-9 !min-h-0 !rounded-md !border-[#d0d7de] !bg-white !px-4 !text-sm !font-semibold !text-[#24292f] hover:!bg-[#eef1f4]"
              />
            )}
            <Button
              label={editingTaskId ? 'Enregistrer la tâche' : 'Ajouter la tâche'}
              type="button"
              primary
              onClick={saveTask}
              className="!h-9 !min-h-0 !rounded-md !border-[#2da44e] !bg-[#2da44e] !px-4 !text-sm !font-semibold !text-white hover:!bg-[#2c974b]"
            />
          </div>
        </div>
      </div>

      {form.taskItems.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-[#57606a]">Aucune tâche pour ce projet.</div>
      ) : (
        <div className="divide-y divide-[#d8dee4]">
          {form.taskItems.map((task) => {
            const TaskIcon = task.completed ? CheckSquare2 : Square;

            return (
              <article key={task.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-3">
                <button
                  type="button"
                  className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-[#57606a] transition hover:bg-[#f6f8fa] hover:text-[#0969da] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da]/30"
                  aria-label={task.completed ? `Marquer ${task.title} comme non terminée` : `Marquer ${task.title} comme terminée`}
                  onClick={() => toggleTask(task.id)}
                >
                  <TaskIcon
                    className={`h-4 w-4 ${task.completed ? 'text-[#1a7f37]' : 'text-[#8c959f]'}`}
                    strokeWidth={1.9}
                  />
                </button>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <h3 className="min-w-0 text-sm font-semibold leading-snug text-[#24292f]">{task.title}</h3>
                    <TaskEditButton onClick={() => editTask(task)} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#57606a]">
                    <StatusPill status={task.status} />
                    <PriorityPill priority={task.priority} />
                    <span className="inline-flex items-center gap-1">
                      {(task.assignees?.length ? task.assignees : [task.responsible]).slice(0, 3).map((assignee) => (
                        <PersonAvatar key={assignee.name} name={assignee.name} />
                      ))}
                      {(task.assignees?.length ? task.assignees : [task.responsible]).length > 3 && (
                        <span>+{(task.assignees?.length ? task.assignees : [task.responsible]).length - 3}</span>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.8} />
                      {formatProjectDate(task.dueDate)}
                    </span>
                    {task.labels.map((label) => (
                      <span
                        key={label}
                        className="inline-flex h-5 items-center rounded-full border border-[#d0d7de] bg-[#f6f8fa] px-2 text-[11px] font-semibold text-[#57606a]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CreateProjectModal({
  mode,
  form,
  error,
  memberOptions,
  labelOptions,
  onChange,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  form: ProjectFormState;
  error: string;
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  onChange: (patch: Partial<ProjectFormState>) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const isEditMode = mode === 'edit';
  const responsibleOptions = [{ label: 'Sélectionner un assigné', value: '' }, ...memberOptions];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
      <form
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-md border border-[#d0d7de] bg-white shadow-[0_18px_50px_rgba(27,31,36,0.28)]"
        onSubmit={onSubmit}
      >
        <div className="flex items-center justify-between border-b border-[#d8dee4] bg-[#f6f8fa] px-5 py-3">
          <h2 className="text-base font-semibold text-[#24292f]">{isEditMode ? 'Modifier le projet' : 'Nouveau projet'}</h2>
          <ToolTip text="Fermer">
            <button
              type="button"
              aria-label={isEditMode ? 'Fermer la modification de projet' : 'Fermer la création de projet'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#57606a] transition hover:bg-[#d8dee4] hover:text-[#24292f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da]/30"
              onClick={onClose}
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </ToolTip>
        </div>

        <div className="min-h-0 overflow-y-auto bg-white p-5">
          {error && (
            <div className="mb-4 rounded-md border border-[#ffcecb] bg-[#ffebe9] px-4 py-3 text-sm font-medium text-[#cf222e]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="space-y-4">
              <div className="rounded-md border border-[#d0d7de] bg-white p-4">
                <FormField
                  id="project-title"
                  label="Titre"
                  value={form.title}
                  required
                  placeholder="Ajouter un titre..."
                  onChange={(title) => onChange({ title })}
                />
              </div>

              <div className="overflow-hidden rounded-md border border-[#d0d7de] bg-white">
                <div className="flex h-10 items-center border-b border-[#d8dee4] bg-[#f6f8fa] px-3">
                  <span className="rounded-md border border-[#d0d7de] bg-white px-3 py-1 text-xs font-semibold text-[#24292f]">
                    Écrire
                  </span>
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

              <ProjectTasksEditor
                form={form}
                memberOptions={memberOptions}
                labelOptions={labelOptions}
                onChange={onChange}
              />
            </section>

            <aside className="space-y-4 rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-4">
              <div>
                <h3 className="text-sm font-semibold text-[#24292f]">Champs du projet</h3>
                <p className="mt-1 text-xs text-[#57606a]">Configure les champs visibles sur les cartes.</p>
              </div>

              <SelectField
                id="project-status"
                label="Statut"
                value={form.status}
                options={projectStatusOptions}
                onChange={(status) => onChange({ status: status as Project['status'] })}
              />

              <SelectField
                id="project-priority"
                label="Priorité"
                value={form.priority}
                options={projectPriorityOptions}
                onChange={(priority) => onChange({ priority: priority as Project['priority'] })}
              />

              <SelectField
                id="project-responsible"
                label="Assigné principal"
                value={form.responsible}
                required
                options={responsibleOptions}
                onChange={(responsible) => onChange({ responsible })}
              />

              <MultiSelectField
                id="project-assignees"
                label="Assignés"
                values={form.assignees}
                options={memberOptions}
                placeholder="Choisir un ou plusieurs assignés"
                onChange={(assignees) => onChange({ assignees })}
              />

              <MultiSelectField
                id="project-labels"
                label="Étiquettes"
                values={form.labels}
                options={labelOptions}
                placeholder="Choisir une ou plusieurs étiquettes"
                onChange={(labels) => onChange({ labels })}
              />

              <div>
                <FieldLabel htmlFor="project-due-date" label="Échéance" required />
                <input
                  id="project-due-date"
                  type="date"
                  value={form.dueDate}
                  required
                  className={fieldClassName}
                  onChange={(event) => onChange({ dueDate: event.target.value })}
                />
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-[#24292f]">Progression</h3>
                <ProgressMeter value={form.progress} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-[#d0d7de] bg-white px-3 py-2">
                  <div className="text-xs font-semibold text-[#57606a]">Terminées</div>
                  <div className="mt-1 text-lg font-semibold text-[#24292f]">{form.completedTasks}</div>
                </div>
                <div className="rounded-md border border-[#d0d7de] bg-white px-3 py-2">
                  <div className="text-xs font-semibold text-[#57606a]">Total</div>
                  <div className="mt-1 text-lg font-semibold text-[#24292f]">{form.totalTasks}</div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#d8dee4] bg-[#f6f8fa] px-5 py-3 sm:flex-row sm:justify-end">
          <Button
            label="Annuler"
            type="button"
            onClick={onClose}
            className="!h-9 !min-h-0 !rounded-md !border-[#d0d7de] !bg-[#f6f8fa] !px-4 !text-sm !font-semibold !text-[#24292f] hover:!bg-[#eef1f4]"
          />
          <Button
            label={isEditMode ? 'Enregistrer' : 'Créer le projet'}
            type="submit"
            primary
            className="!h-9 !min-h-0 !rounded-md !border-[#2da44e] !bg-[#2da44e] !px-4 !text-sm !font-semibold !text-white hover:!bg-[#2c974b]"
          />
        </div>
      </form>
    </div>
  );
}

function ProjectDetailModal({
  project,
  tasks,
  memberOptions,
  labelOptions,
  onClose,
  onUpdateProject,
  onAddTask,
  onUpdateTask,
  onToggleTask,
}: {
  project: Project;
  tasks: ProjectTask[];
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  onClose: () => void;
  onUpdateProject: (projectId: string, form: ProjectFormState) => void;
  onAddTask: (project: Project, task: ProjectTaskDraft) => void;
  onUpdateTask: (projectId: string, taskId: string, task: ProjectTaskDraft) => void;
  onToggleTask: (projectId: string, taskId: string) => void;
}) {
  const [editingProject, setEditingProject] = React.useState(false);
  const [projectEditForm, setProjectEditForm] = React.useState<ProjectFormState>(() => projectToFormState(project));
  const [projectEditError, setProjectEditError] = React.useState('');
  const [taskForm, setTaskForm] = React.useState<TaskFormState>(() => createTaskFormState(project));
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [taskFormError, setTaskFormError] = React.useState('');
  const responsibleOptions = [{ label: 'Sélectionner un assigné', value: '' }, ...memberOptions];

  React.useEffect(() => {
    setProjectEditForm(projectToFormState(project));
    setProjectEditError('');
    setEditingProject(false);
    setTaskForm(createTaskFormState(project));
    setEditingTaskId(null);
    setTaskFormError('');
  }, [project]);

  const updateProjectEditForm = (patch: Partial<ProjectFormState>) => {
    setProjectEditForm((current) => ({ ...current, ...patch }));
    if (projectEditError) setProjectEditError('');
  };

  const updateTaskForm = (patch: Partial<TaskFormState>) => {
    setTaskForm((current) => ({ ...current, ...patch }));
    if (taskFormError) setTaskFormError('');
  };

  const submitProjectEdit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = projectEditForm.title.trim();
    const description = projectEditForm.description.trim();
    const responsibleName = projectEditForm.responsible.trim();
    const dueDate = projectEditForm.dueDate;

    if (!title || !description || !responsibleName || !dueDate) {
      setProjectEditError('Les champs obligatoires doivent être renseignés.');
      return;
    }

    onUpdateProject(project.id, projectEditForm);
    setEditingProject(false);
  };

  const submitTask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = taskForm.title.trim();
    if (!title) {
      setTaskFormError('Le titre de la tâche est obligatoire.');
      return;
    }

    const assigneeNames = getUniqueValues(
      taskForm.assignees.length > 0 ? taskForm.assignees : [project.responsible.name]
    );
    const taskDraft: ProjectTaskDraft = {
      title,
      status: taskForm.status,
      responsible: { name: assigneeNames[0] || project.responsible.name },
      assignees: assigneeNames.map((name) => ({ name })),
      priority: taskForm.priority,
      labels: taskForm.labels,
      dueDate: taskForm.dueDate,
    };

    if (editingTaskId) {
      onUpdateTask(project.id, editingTaskId, taskDraft);
    } else {
      onAddTask(project, taskDraft);
    }
    setTaskForm(createTaskFormState(project));
    setEditingTaskId(null);
    setTaskFormError('');
  };

  const editTask = (task: ProjectTask) => {
    setTaskForm(taskToFormState(task));
    setEditingTaskId(task.id);
    setTaskFormError('');
  };

  const cancelTaskEdit = () => {
    setTaskForm(createTaskFormState(project));
    setEditingTaskId(null);
    setTaskFormError('');
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-stretch justify-end bg-black/45 p-0 sm:p-4">
      <button type="button" aria-label="Fermer le projet" className="absolute inset-0" onClick={onClose} />

      <section className="relative z-10 flex h-full w-full flex-col overflow-hidden border-l border-[#d0d7de] bg-white shadow-[0_18px_50px_rgba(27,31,36,0.28)] sm:max-w-6xl sm:rounded-md sm:border">
        <header className="flex items-start justify-between gap-4 border-b border-[#d8dee4] bg-[#f6f8fa] px-5 py-4">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium text-[#57606a]">Mairie360 / projets #{project.id}</p>
            <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-[#24292f]">{project.title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-xs font-semibold text-[#24292f] transition hover:bg-[#f6f8fa]"
              onClick={() => setEditingProject((current) => !current)}
            >
              {editingProject ? 'Annuler' : 'Modifier'}
            </button>
            <ToolTip text="Fermer">
              <button
                type="button"
                aria-label="Fermer la fiche projet"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#57606a] transition hover:bg-[#d8dee4] hover:text-[#24292f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da]/30"
                onClick={onClose}
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </ToolTip>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid min-h-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
            <main className="min-w-0 border-r border-[#d8dee4] p-5">
              <div className="mb-5 rounded-md border border-[#d0d7de] bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#24292f]">
                  <CircleDot className="h-4 w-4 text-[#1a7f37]" strokeWidth={2} />
                  Ajouter une tâche
                </div>

                <form className="space-y-3" onSubmit={submitTask}>
                  <input
                    value={taskForm.title}
                    placeholder="Ajouter une tâche..."
                    className="h-10 w-full rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm text-[#24292f] outline-none transition placeholder:text-[#6e7781] focus:border-[#0969da] focus:bg-white focus:ring-2 focus:ring-[#0969da]/20"
                    onChange={(event) => updateTaskForm({ title: event.target.value })}
                  />

                  {taskFormError && <p className="text-xs font-medium text-[#cf222e]">{taskFormError}</p>}

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <SelectField
                      id="detail-task-status"
                      label="Statut"
                      value={taskForm.status}
                      options={projectStatusOptions}
                      onChange={(status) => updateTaskForm({ status: status as Project['status'] })}
                    />
                    <SelectField
                      id="detail-task-priority"
                      label="Priorité"
                      value={taskForm.priority}
                      options={projectPriorityOptions}
                      onChange={(priority) => updateTaskForm({ priority: priority as Project['priority'] })}
                    />
                    <div>
                      <FieldLabel htmlFor="detail-task-due-date" label="Échéance" />
                      <input
                        id="detail-task-due-date"
                        type="date"
                        value={taskForm.dueDate}
                        className={fieldClassName}
                        onChange={(event) => updateTaskForm({ dueDate: event.target.value })}
                      />
                    </div>
                  </div>

                  <MultiSelectField
                    id="detail-task-assignees"
                    label="Assignés"
                    values={taskForm.assignees}
                    options={memberOptions}
                    placeholder="Choisir un ou plusieurs assignés"
                    onChange={(assignees) => updateTaskForm({ assignees })}
                  />

                  <MultiSelectField
                    id="detail-task-labels"
                    label="Étiquettes"
                    values={taskForm.labels}
                    options={labelOptions}
                    placeholder="Choisir une ou plusieurs étiquettes"
                    onChange={(labels) => updateTaskForm({ labels })}
                  />

                  <div className="flex justify-end gap-2">
                    {editingTaskId && (
                      <Button
                        label="Annuler"
                        type="button"
                        onClick={cancelTaskEdit}
                        className="!h-9 !min-h-0 !rounded-md !border-[#d0d7de] !bg-white !px-4 !text-sm !font-semibold !text-[#24292f] hover:!bg-[#eef1f4]"
                      />
                    )}
                    <Button
                      label={editingTaskId ? 'Enregistrer la tâche' : 'Ajouter la tâche'}
                      type="submit"
                      primary
                      className="!h-9 !min-h-0 !rounded-md !border-[#2da44e] !bg-[#2da44e] !px-4 !text-sm !font-semibold !text-white hover:!bg-[#2c974b]"
                    />
                  </div>
                </form>
              </div>

              <section className="overflow-hidden rounded-md border border-[#d0d7de] bg-white">
                <div className="flex items-center justify-between border-b border-[#d8dee4] bg-[#f6f8fa] px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#24292f]">
                    <ListChecks className="h-4 w-4 text-[#57606a]" strokeWidth={1.8} />
                    Tâches
                  </div>
                  <span className="text-xs font-medium text-[#57606a]">
                    {project.tasks.completed}/{project.tasks.total}
                  </span>
                </div>

                {tasks.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-[#57606a]">Aucune tâche pour ce projet.</div>
                ) : (
                  <div className="divide-y divide-[#d8dee4]">
                    {tasks.map((task) => {
                      const TaskIcon = task.completed ? CheckSquare2 : Square;

                      return (
                        <article key={task.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-3">
                          <button
                            type="button"
                            className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-[#57606a] transition hover:bg-[#f6f8fa] hover:text-[#0969da] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da]/30"
                            aria-label={task.completed ? `Marquer ${task.title} comme non terminée` : `Marquer ${task.title} comme terminée`}
                            onClick={() => onToggleTask(project.id, task.id)}
                          >
                            <TaskIcon
                              className={`h-4 w-4 ${task.completed ? 'text-[#1a7f37]' : 'text-[#8c959f]'}`}
                              strokeWidth={1.9}
                            />
                          </button>
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <h3 className="min-w-0 text-sm font-semibold leading-snug text-[#24292f]">{task.title}</h3>
                              <TaskEditButton onClick={() => editTask(task)} />
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#57606a]">
                              <StatusPill status={task.status} />
                              <PriorityPill priority={task.priority} />
                              <span className="inline-flex items-center gap-1">
                                {(task.assignees?.length ? task.assignees : [task.responsible]).slice(0, 3).map((assignee) => (
                                  <PersonAvatar key={assignee.name} name={assignee.name} />
                                ))}
                                {(task.assignees?.length ? task.assignees : [task.responsible]).length > 3 && (
                                  <span>+{(task.assignees?.length ? task.assignees : [task.responsible]).length - 3}</span>
                                )}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.8} />
                                {formatProjectDate(task.dueDate)}
                              </span>
                              {task.labels.map((label) => (
                                <span
                                  key={label}
                                  className="inline-flex h-5 items-center rounded-full border border-[#d0d7de] bg-[#f6f8fa] px-2 text-[11px] font-semibold text-[#57606a]"
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </main>

            <aside className="bg-[#f6f8fa] p-5">
              {editingProject ? (
                <form className="space-y-4" onSubmit={submitProjectEdit}>
                  <div>
                    <h3 className="text-sm font-semibold text-[#24292f]">Modifier le projet</h3>
                    <p className="mt-1 text-xs text-[#57606a]">Les tâches restent visibles pendant l’édition.</p>
                  </div>

                  {projectEditError && (
                    <div className="rounded-md border border-[#ffcecb] bg-[#ffebe9] px-3 py-2 text-xs font-medium text-[#cf222e]">
                      {projectEditError}
                    </div>
                  )}

                  <FormField
                    id="detail-project-title"
                    label="Titre"
                    value={projectEditForm.title}
                    required
                    placeholder="Ajouter un titre..."
                    onChange={(title) => updateProjectEditForm({ title })}
                  />

                  <TextAreaField
                    id="detail-project-description"
                    label="Description"
                    value={projectEditForm.description}
                    required
                    placeholder="Ajouter une description..."
                    onChange={(description) => updateProjectEditForm({ description })}
                  />

                  <SelectField
                    id="detail-project-status"
                    label="Statut"
                    value={projectEditForm.status}
                    options={projectStatusOptions}
                    onChange={(status) => updateProjectEditForm({ status: status as Project['status'] })}
                  />

                  <SelectField
                    id="detail-project-priority"
                    label="Priorité"
                    value={projectEditForm.priority}
                    options={projectPriorityOptions}
                    onChange={(priority) => updateProjectEditForm({ priority: priority as Project['priority'] })}
                  />

                  <SelectField
                    id="detail-project-responsible"
                    label="Assigné principal"
                    value={projectEditForm.responsible}
                    required
                    options={responsibleOptions}
                    onChange={(responsible) => updateProjectEditForm({ responsible })}
                  />

                  <MultiSelectField
                    id="detail-project-assignees"
                    label="Assignés"
                    values={projectEditForm.assignees}
                    options={memberOptions}
                    placeholder="Choisir un ou plusieurs assignés"
                    onChange={(assignees) => updateProjectEditForm({ assignees })}
                  />

                  <MultiSelectField
                    id="detail-project-labels"
                    label="Étiquettes"
                    values={projectEditForm.labels}
                    options={labelOptions}
                    placeholder="Choisir une ou plusieurs étiquettes"
                    onChange={(labels) => updateProjectEditForm({ labels })}
                  />

                  <div>
                    <FieldLabel htmlFor="detail-project-due-date" label="Échéance" required />
                    <input
                      id="detail-project-due-date"
                      type="date"
                      value={projectEditForm.dueDate}
                      required
                      className={fieldClassName}
                      onChange={(event) => updateProjectEditForm({ dueDate: event.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      label="Annuler"
                      type="button"
                      onClick={() => {
                        setProjectEditForm(projectToFormState(project));
                        setProjectEditError('');
                        setEditingProject(false);
                      }}
                      className="!h-9 !min-h-0 !rounded-md !border-[#d0d7de] !bg-white !px-4 !text-sm !font-semibold !text-[#24292f] hover:!bg-[#eef1f4]"
                    />
                    <Button
                      label="Enregistrer"
                      type="submit"
                      primary
                      className="!h-9 !min-h-0 !rounded-md !border-[#2da44e] !bg-[#2da44e] !px-4 !text-sm !font-semibold !text-white hover:!bg-[#2c974b]"
                    />
                  </div>
                </form>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-[#24292f]">Description</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#57606a]">{project.description}</p>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-[#24292f]">Progression</h3>
                    <ProgressMeter value={project.progress} />
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#57606a]">Statut</span>
                      <StatusPill status={project.status} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#57606a]">Priorité</span>
                      <PriorityPill priority={project.priority} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#57606a]">Responsable</span>
                      <span className="inline-flex min-w-0 items-center gap-2 font-medium text-[#24292f]">
                        <PersonAvatar name={project.responsible.name} />
                        <span className="truncate">{project.responsible.name}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#57606a]">Échéance</span>
                      <span className="font-medium text-[#24292f]">{formatProjectDate(project.dueDate)}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-[#24292f]">Assignés</h3>
                    <div className="flex flex-wrap gap-2">
                      {project.assignees.map((assignee) => (
                        <span
                          key={assignee.name}
                          className="inline-flex items-center gap-2 rounded-full border border-[#d0d7de] bg-white px-2.5 py-1 text-xs font-medium text-[#24292f]"
                        >
                          <PersonAvatar name={assignee.name} />
                          {assignee.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-[#24292f]">Étiquettes</h3>
                    <div className="flex flex-wrap gap-2">
                      {project.labels.map((label) => (
                        <span
                          key={label}
                          className="inline-flex h-6 items-center rounded-full border border-[#d0d7de] bg-white px-2.5 text-xs font-semibold text-[#57606a]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  open,
  widthClassName = 'sm:w-40',
  onOpenChange,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  open: boolean;
  widthClassName?: string;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className={`relative w-full ${widthClassName}`}>
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between rounded-md border border-[#d0ccc7] bg-white px-3 text-left text-sm text-[#2f3438] shadow-sm transition hover:border-[#b9d6d5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4b908d]/25"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#8a8f94]" strokeWidth={1.8} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-30 w-full overflow-hidden rounded-md border border-[#d9d5d0] bg-white py-1 shadow-[0_8px_20px_rgba(28,31,35,0.15)]"
          role="listbox"
          aria-label={label}
        >
          {options.map((option) => {
            const isActive = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`flex h-9 w-full items-center justify-between px-3 text-left text-sm transition ${
                  isActive ? 'bg-[#d4eeee] text-[#2b706c]' : 'text-[#2f3438] hover:bg-[#f4f1ee]'
                }`}
                onClick={() => {
                  onChange(option.value);
                  onOpenChange(false);
                }}
              >
                <span>{option.label}</span>
                {isActive && <Check className="h-4 w-4" strokeWidth={1.9} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (value: ViewMode) => void }) {
  return (
    <div className="inline-flex h-10 rounded-lg bg-[#ebe9e6] p-1" role="tablist" aria-label="Vue des projets">
      {viewOptions.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`inline-flex min-w-[82px] items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
              active ? 'bg-white text-[#172033] shadow-sm' : 'text-[#3f4750] hover:bg-white/70'
            }`}
            onClick={() => onChange(option.value)}
          >
            <Icon className="h-4 w-4" strokeWidth={1.8} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative w-full max-w-[448px]">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b97a6]" />
      <input
        type="search"
        value={value}
        placeholder="Rechercher des projets..."
        className="h-10 w-full rounded-md border border-[#d0ccc7] bg-white py-2 pl-11 pr-4 text-sm text-[#172033] shadow-sm outline-none transition placeholder:text-[#66768a] focus:border-[#4b908d] focus:ring-2 focus:ring-[#4b908d]/15"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-[#d0ccc7] bg-white px-6 py-12 text-center text-sm text-[#66717c]">
      Aucun projet ne correspond aux filtres sélectionnés.
    </div>
  );
}

function GridView({
  projects,
  memberOptions,
  labelOptions,
  onProjectOpen,
  onProjectEdit,
  onProjectDuplicate,
  onProjectDelete,
  onProjectTaskAdd,
}: {
  projects: Project[];
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  onProjectOpen: (project: Project) => void;
  onProjectEdit: (project: Project) => void;
  onProjectDuplicate: (project: Project) => void;
  onProjectDelete: (project: Project) => void;
  onProjectTaskAdd: (project: Project, task: ProjectTaskDraft) => void;
}) {
  if (projects.length === 0) return <EmptyState />;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          variant="grid"
          memberOptions={memberOptions}
          labelOptions={labelOptions}
          onOpen={onProjectOpen}
          onEdit={onProjectEdit}
          onDuplicate={onProjectDuplicate}
          onDelete={onProjectDelete}
          onAddTask={onProjectTaskAdd}
        />
      ))}
    </div>
  );
}

function TableView({
  projects,
  onProjectOpen,
  onProjectEdit,
  onProjectDuplicate,
  onProjectDelete,
}: {
  projects: Project[];
  onProjectOpen: (project: Project) => void;
  onProjectEdit: (project: Project) => void;
  onProjectDuplicate: (project: Project) => void;
  onProjectDelete: (project: Project) => void;
}) {
  if (projects.length === 0) return <EmptyState />;

  return (
    <div className="overflow-hidden rounded-lg border border-[#d9d5d0] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1060px] text-left">
          <thead className="border-b border-[#d9d5d0] bg-[#fbfaf8] text-base font-semibold text-[#2f3438]">
            <tr>
              <th className="px-5 py-4">Projet</th>
              <th className="px-5 py-4">Statut</th>
              <th className="px-5 py-4">Responsable</th>
              <th className="px-5 py-4">Priorité</th>
              <th className="px-5 py-4">Progression</th>
              <th className="px-5 py-4">Échéance</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e4e1dc]">
            {projects.map((project) => (
              <tr
                key={project.id}
                className="cursor-pointer transition hover:bg-[#f8f6f3]"
                onClick={() => onProjectOpen(project)}
              >
                <td className="max-w-[360px] px-5 py-4">
                  <div className="truncate text-base font-semibold text-[#172033]">{project.title}</div>
                  <div className="truncate text-sm text-[#5e6873]">{project.description}</div>
                </td>
                <td className="px-5 py-4">
                  <StatusPill status={project.status} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 text-sm text-[#2f3438]">
                    <PersonAvatar name={project.responsible.name} />
                    <span>{project.responsible.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <PriorityPill priority={project.priority} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex w-36 items-center gap-3">
                    <div className="w-20">
                      <ProgressMeter value={project.progress} showLabel={false} compact />
                    </div>
                    <span className="text-sm font-semibold text-[#2f3438]">{project.progress}%</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-[#5e6873]">{formatProjectDate(project.dueDate)}</td>
                <td className="px-5 py-4">
                  <ProjectActionsMenu
                    project={project}
                    onEdit={onProjectEdit}
                    onDuplicate={onProjectDuplicate}
                    onDelete={onProjectDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openFilter, setOpenFilter] = useState<'status' | 'priority' | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(() => createProjectFormState());
  const [projectFormError, setProjectFormError] = useState('');

  const memberOptions = useMemo(
    () =>
      createSelectOptions([
        ...defaultProjectMembers,
        ...projects.flatMap((project) => [
          project.responsible.name,
          ...project.assignees.map((assignee) => assignee.name),
        ]),
      ]),
    [projects]
  );

  const labelOptions = useMemo(
    () => createSelectOptions([...defaultProjectLabels, ...projects.flatMap((project) => project.labels)]),
    [projects]
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        project.title.toLowerCase().includes(normalizedSearch) ||
        project.description.toLowerCase().includes(normalizedSearch) ||
        project.labels.some((label) => label.toLowerCase().includes(normalizedSearch));

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [priorityFilter, projects, searchTerm, statusFilter]);

  const showInfo = (message: string) => {
    setAlert({ type: 'info', message });
  };

  const openCreateProject = (status: Project['status'] = 'todo') => {
    setProjectForm(createProjectFormState(status));
    setEditingProjectId(null);
    setProjectFormError('');
    setOpenFilter(null);
    setCreateProjectOpen(true);
  };

  const openEditProject = (project: Project) => {
    setProjectForm(projectToFormState(project));
    setEditingProjectId(project.id);
    setProjectFormError('');
    setOpenFilter(null);
    setCreateProjectOpen(true);
  };

  const closeCreateProject = () => {
    setCreateProjectOpen(false);
    setEditingProjectId(null);
    setProjectFormError('');
  };

  const updateProjectForm = (patch: Partial<ProjectFormState>) => {
    setProjectForm((current) => ({ ...current, ...patch }));
    if (projectFormError) setProjectFormError('');
  };

  const updateProjectFromForm = (projectId: string, form: ProjectFormState) => {
    const title = form.title.trim();
    const description = form.description.trim();
    const responsibleName = form.responsible.trim();
    const dueDate = form.dueDate;

    if (!title || !description || !responsibleName || !dueDate) return;

    const assigneeNames = getUniqueValues([responsibleName, ...form.assignees]);

    setProjects((currentProjects) =>
      currentProjects.map((project) => {
        if (project.id !== projectId) return project;

        return {
          ...project,
          title,
          description,
          status: form.status,
          responsible: { name: responsibleName },
          assignees: assigneeNames.map((name) => ({ name })),
          dueDate,
          priority: form.priority,
          labels: getUniqueValues(form.labels),
        };
      })
    );

    setAlert({ type: 'success', message: `Projet "${title}" modifié.` });
  };

  const saveProject = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = projectForm.title.trim();
    const description = projectForm.description.trim();
    const responsibleName = projectForm.responsible.trim();
    const dueDate = projectForm.dueDate;

    if (!title || !description || !responsibleName || !dueDate) {
      setProjectFormError('Les champs obligatoires doivent être renseignés.');
      return;
    }

    const taskItems = projectForm.taskItems.map((task) => ({
      ...task,
      responsible: { ...task.responsible },
      assignees: task.assignees.map((assignee) => ({ ...assignee })),
      labels: [...task.labels],
    }));
    const totalTasks = taskItems.length;
    const completedTasks = taskItems.filter((task) => task.completed).length;
    const progress = calculateProjectProgress(taskItems);
    const assigneeNames = getUniqueValues([responsibleName, ...projectForm.assignees]);

    const projectFields = {
      title,
      description,
      status: projectForm.status,
      responsible: { name: responsibleName },
      assignees: assigneeNames.map((name) => ({ name })),
      progress,
      dueDate,
      priority: projectForm.priority,
      labels: getUniqueValues(projectForm.labels),
      taskItems,
      tasks: {
        total: totalTasks,
        completed: completedTasks,
      },
    };

    if (editingProjectId) {
      setProjects((currentProjects) =>
        currentProjects.map((project) => (project.id === editingProjectId ? { ...project, ...projectFields } : project))
      );
      setCreateProjectOpen(false);
      setEditingProjectId(null);
      setAlert({ type: 'success', message: `Projet "${title}" modifié.` });
      return;
    }

    const newProject: Project = {
      id: `project-${Date.now()}`,
      ...projectFields,
      createdAt: formatInputDate(new Date()),
    };

    setProjects((currentProjects) => [newProject, ...currentProjects]);
    setSelectedProjectId(newProject.id);
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCreateProjectOpen(false);
    setAlert({ type: 'success', message: `Projet "${newProject.title}" créé.` });
  };

  const duplicateProject = (project: Project) => {
    const duplicatedProject: Project = {
      ...project,
      id: `project-${Date.now()}`,
      title: `${project.title} (copie)`,
      responsible: { ...project.responsible },
      assignees: project.assignees.map((assignee) => ({ ...assignee })),
      labels: [...project.labels],
      taskItems: project.taskItems?.map((task, index) => ({
        ...task,
        id: `task-${Date.now()}-${index}`,
        responsible: { ...task.responsible },
        assignees: task.assignees.map((assignee) => ({ ...assignee })),
        labels: [...task.labels],
      })),
      tasks: { ...project.tasks },
      createdAt: formatInputDate(new Date()),
    };

    setProjects((currentProjects) => [duplicatedProject, ...currentProjects]);
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setAlert({ type: 'success', message: `Projet "${duplicatedProject.title}" dupliqué.` });
  };

  const deleteProject = (project: Project) => {
    const confirmed = window.confirm(`Supprimer le projet "${project.title}" ?`);
    if (!confirmed) return;

    setProjects((currentProjects) => currentProjects.filter((currentProject) => currentProject.id !== project.id));
    if (selectedProjectId === project.id) setSelectedProjectId(null);
    if (editingProjectId === project.id) closeCreateProject();
    setAlert({ type: 'success', message: `Projet "${project.title}" supprimé.` });
  };

  const addProjectTask = (project: Project, taskDraft: ProjectTaskDraft) => {
    const title = taskDraft.title.trim();
    if (!title) return;

    const task: ProjectTask = {
      ...taskDraft,
      responsible: { ...taskDraft.responsible },
      assignees: taskDraft.assignees.map((assignee) => ({ ...assignee })),
      labels: [...taskDraft.labels],
      title,
      id: `task-${Date.now()}`,
      completed: taskDraft.status === 'done',
      createdAt: formatInputDate(new Date()),
    };

    setProjects((currentProjects) =>
      currentProjects.map((currentProject) => {
        if (currentProject.id !== project.id) return currentProject;

        const taskItems = [...createInitialTaskItems(currentProject), task];
        const completedTasks = taskItems.filter((projectTask) => projectTask.completed).length;
        const totalTasks = taskItems.length;
        const progress = calculateProjectProgress(taskItems);

        return {
          ...currentProject,
          taskItems,
          tasks: {
            total: totalTasks,
            completed: completedTasks,
          },
          progress,
        };
      })
    );

    setAlert({ type: 'success', message: `Tâche "${title}" ajoutée à "${project.title}".` });
  };

  const updateProjectTask = (projectId: string, taskId: string, taskDraft: ProjectTaskDraft) => {
    const title = taskDraft.title.trim();
    if (!title) return;

    setProjects((currentProjects) =>
      currentProjects.map((project) => {
        if (project.id !== projectId) return project;

        const taskItems = createInitialTaskItems(project).map((task) => {
          if (task.id !== taskId) return task;

          return {
            ...task,
            ...taskDraft,
            title,
            responsible: { ...taskDraft.responsible },
            assignees: taskDraft.assignees.map((assignee) => ({ ...assignee })),
            labels: [...taskDraft.labels],
            completed: taskDraft.status === 'done',
          };
        });
        const completedTasks = taskItems.filter((task) => task.completed).length;

        return {
          ...project,
          taskItems,
          progress: calculateProjectProgress(taskItems),
          tasks: {
            total: taskItems.length,
            completed: completedTasks,
          },
        };
      })
    );

    setAlert({ type: 'success', message: `Tâche "${title}" modifiée.` });
  };

  const toggleProjectTask = (projectId: string, taskId: string) => {
    setProjects((currentProjects) =>
      currentProjects.map((project) => {
        if (project.id !== projectId) return project;

        const taskItems = createInitialTaskItems(project).map((task) => {
          if (task.id !== taskId) return task;

          const completed = !task.completed;

          return {
            ...task,
            completed,
            status: (completed ? 'done' : 'todo') as Project['status'],
          };
        });
        const completedTasks = taskItems.filter((task) => task.completed).length;

        return {
          ...project,
          taskItems,
          progress: calculateProjectProgress(taskItems),
          tasks: {
            total: taskItems.length,
            completed: completedTasks,
          },
        };
      })
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f6f4f1] text-[#172033]">
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          tasks={createInitialTaskItems(selectedProject)}
          memberOptions={memberOptions}
          labelOptions={labelOptions}
          onClose={() => setSelectedProjectId(null)}
          onUpdateProject={updateProjectFromForm}
          onAddTask={addProjectTask}
          onUpdateTask={updateProjectTask}
          onToggleTask={toggleProjectTask}
        />
      )}

      {createProjectOpen && (
        <CreateProjectModal
          mode={editingProjectId ? 'edit' : 'create'}
          form={projectForm}
          error={projectFormError}
          memberOptions={memberOptions}
          labelOptions={labelOptions}
          onChange={updateProjectForm}
          onClose={closeCreateProject}
          onSubmit={saveProject}
        />
      )}

      <div className="flex h-full">
        <div className="hidden shrink-0 lg:block">
          <Sidebar activeItem="projects" isAdmin brandLabel="Mairie360" brandInitial="M" />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <button
              type="button"
              aria-label="Fermer la navigation"
              className="absolute inset-0 bg-black/30"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative z-10">
              <Sidebar
                activeItem="projects"
                isAdmin
                brandLabel="Mairie360"
                brandInitial="M"
                onItemSelect={() => setSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            user={{ name: 'Admin Système', email: 'admin@mairie360.fr', role: 'admin' }}
            isAdmin
            setSidebarOpen={setSidebarOpen}
            onPageChange={(page) => showInfo(`Navigation : ${page}`)}
            onLogout={() => showInfo('Déconnexion en attente.')}
          />

          <main className="min-h-0 flex-1 overflow-y-auto bg-[#f6f4f1]">
            <div className="mx-auto w-full max-w-[1660px] px-6 py-10 lg:px-14 lg:py-14">
              {alert && (
                <div className="mb-5">
                  <Alert
                    type={alert.type}
                    message={alert.message}
                    closable
                    autoDismiss={3000}
                    onClose={() => setAlert(null)}
                  />
                </div>
              )}

              <section className="border-b border-[#dedbd6] pb-8">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold leading-tight text-[#172033]">Projets</h1>
                    <p className="mt-2 text-sm text-[#536171]">
                      Gérez vos projets municipaux avec des vues Kanban, tableau et grille
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <ActionButton label="Nouveau projet" icon={Plus} primary onClick={() => openCreateProject()} />
                    <ActionButton
                      label="Paramètres"
                      icon={Settings}
                      onClick={() => showInfo('Paramètres en cours de développement.')}
                    />
                  </div>
                </div>
              </section>

              <section className="border-b border-[#e3e0dc] py-7">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-1 flex-col gap-3 md:flex-row">
                    <SearchInput value={searchTerm} onChange={setSearchTerm} />
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <FilterSelect
                        label="Filtrer par statut"
                        value={statusFilter}
                        options={statusOptions}
                        open={openFilter === 'status'}
                        onOpenChange={(open) => setOpenFilter(open ? 'status' : null)}
                        onChange={setStatusFilter}
                      />
                      <FilterSelect
                        label="Filtrer par priorité"
                        value={priorityFilter}
                        options={priorityOptions}
                        open={openFilter === 'priority'}
                        widthClassName="sm:w-48"
                        onOpenChange={(open) => setOpenFilter(open ? 'priority' : null)}
                        onChange={setPriorityFilter}
                      />
                    </div>
                  </div>

                  <ViewToggle value={viewMode} onChange={setViewMode} />
                </div>
              </section>

              <section className="pt-8">
                {viewMode === 'kanban' && (
                  <KanbanBoard
                    projects={filteredProjects}
                    memberOptions={memberOptions}
                    labelOptions={labelOptions}
                    onProjectOpen={openEditProject}
                    onProjectEdit={openEditProject}
                    onProjectDuplicate={duplicateProject}
                    onProjectDelete={deleteProject}
                    onProjectTaskAdd={addProjectTask}
                    onAddProject={openCreateProject}
                  />
                )}

                {viewMode === 'grid' && (
                  <GridView
                    projects={filteredProjects}
                    memberOptions={memberOptions}
                    labelOptions={labelOptions}
                    onProjectOpen={openEditProject}
                    onProjectEdit={openEditProject}
                    onProjectDuplicate={duplicateProject}
                    onProjectDelete={deleteProject}
                    onProjectTaskAdd={addProjectTask}
                  />
                )}

                {viewMode === 'table' && (
                  <TableView
                    projects={filteredProjects}
                    onProjectOpen={openEditProject}
                    onProjectEdit={openEditProject}
                    onProjectDuplicate={duplicateProject}
                    onProjectDelete={deleteProject}
                  />
                )}
              </section>
            </div>
          </main>

          <Footer productName="Mairie360" year={2026} version="2.1.0" className="shrink-0" />
        </div>
      </div>
    </div>
  );
}
