'use client';

import React, { useMemo, useState } from 'react';
import { Alert, Button, Footer, Header, Sidebar, ToolTip } from '@mairie360/lib-components';
import {
  Check,
  ChevronDown,
  Grid3X3,
  Kanban,
  List,
  Plus,
  Search,
  Settings,
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
import { mockProjects, type Project } from '../types/project';

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
  assignees: string;
  labels: string;
  dueDate: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
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
    assignees: '',
    labels: '',
    dueDate: getDateWithOffset(30),
    progress: 0,
    totalTasks: 1,
    completedTasks: 0,
  };
}

function projectToFormState(project: Project): ProjectFormState {
  const responsibleName = project.responsible.name;
  const participantNames = project.assignees
    .map((assignee) => assignee.name)
    .filter((name) => name !== responsibleName);

  return {
    title: project.title,
    description: project.description,
    status: project.status,
    priority: project.priority,
    responsible: responsibleName,
    assignees: participantNames.join(', '),
    labels: project.labels.join(', '),
    dueDate: project.dueDate,
    progress: project.progress,
    totalTasks: project.tasks.total,
    completedTasks: project.tasks.completed,
  };
}

function parseCommaList(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
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
    <label htmlFor={htmlFor} className="text-sm font-semibold text-[#2f3438]">
      {label}
      {required && <span className="ml-1 text-[#e60012]">*</span>}
    </label>
  );
}

const fieldClassName =
  'mt-2 h-10 w-full rounded-md border border-[#d0ccc7] bg-white px-3 text-sm text-[#172033] shadow-sm outline-none transition placeholder:text-[#8a8f94] focus:border-[#4b908d] focus:ring-2 focus:ring-[#4b908d]/15';

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
        rows={3}
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
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} />
      <select id={id} value={value} className={fieldClassName} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} />
      <input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        className={fieldClassName}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function CreateProjectModal({
  mode,
  form,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  form: ProjectFormState;
  error: string;
  onChange: (patch: Partial<ProjectFormState>) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const isEditMode = mode === 'edit';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 p-4">
      <form
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-[#d9d5d0] bg-white shadow-[0_18px_50px_rgba(20,24,28,0.24)]"
        onSubmit={onSubmit}
      >
        <div className="flex items-center justify-between border-b border-[#e3e0dc] px-6 py-4">
          <h2 className="text-xl font-bold text-[#172033]">{isEditMode ? 'Modifier le projet' : 'Nouveau projet'}</h2>
          <ToolTip text="Fermer">
            <button
              type="button"
              aria-label={isEditMode ? 'Fermer la modification de projet' : 'Fermer la création de projet'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#4c5258] transition hover:bg-[#f1efeb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4b908d]/30"
              onClick={onClose}
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </ToolTip>
        </div>

        <div className="min-h-0 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-md border border-[#ffb5bd] bg-[#fff1f2] px-4 py-3 text-sm font-medium text-[#e60012]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FormField
                id="project-title"
                label="Nom du projet"
                value={form.title}
                required
                placeholder="Ex. Extension de l'école municipale"
                onChange={(title) => onChange({ title })}
              />
            </div>

            <div className="md:col-span-2">
              <TextAreaField
                id="project-description"
                label="Description"
                value={form.description}
                required
                placeholder="Résumé court du projet"
                onChange={(description) => onChange({ description })}
              />
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

            <FormField
              id="project-responsible"
              label="Responsable"
              value={form.responsible}
              required
              placeholder="Ex. Marie Dubois"
              onChange={(responsible) => onChange({ responsible })}
            />

            <FormField
              id="project-assignees"
              label="Participants"
              value={form.assignees}
              placeholder="Pierre Martin, Sophie Leroy"
              onChange={(assignees) => onChange({ assignees })}
            />

            <FormField
              id="project-labels"
              label="Labels"
              value={form.labels}
              placeholder="Voirie, Travaux"
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

            <NumberField
              id="project-progress"
              label="Progression"
              value={form.progress}
              min={0}
              max={100}
              onChange={(progress) => onChange({ progress })}
            />

            <div className="grid grid-cols-2 gap-3">
              <NumberField
                id="project-completed-tasks"
                label="Tâches faites"
                value={form.completedTasks}
                min={0}
                max={999}
                onChange={(completedTasks) => onChange({ completedTasks })}
              />
              <NumberField
                id="project-total-tasks"
                label="Total tâches"
                value={form.totalTasks}
                min={1}
                max={999}
                onChange={(totalTasks) => onChange({ totalTasks })}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#e3e0dc] bg-[#fbfaf8] px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            label="Annuler"
            type="button"
            onClick={onClose}
            className="!h-10 !min-h-0 !rounded-md !border-[#d9d5d0] !bg-white !px-4 !text-sm !font-semibold !text-[#2f3438] hover:!border-[#b9d6d5] hover:!bg-[#fafafa]"
          />
          <Button
            label={isEditMode ? 'Enregistrer' : 'Créer le projet'}
            type="submit"
            primary
            className="!h-10 !min-h-0 !rounded-md !border-[#1256a6] !bg-[#1256a6] !px-4 !text-sm !font-semibold !text-white hover:!bg-[#0f4b92]"
          />
        </div>
      </form>
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
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          variant="grid"
          onOpen={onProjectOpen}
          onEdit={onProjectEdit}
          onDuplicate={onProjectDuplicate}
          onDelete={onProjectDelete}
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

  const showProject = (project: Project) => {
    showInfo(`Projet : ${project.title}`);
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

    const totalTasks = Math.max(1, Math.round(Number(projectForm.totalTasks) || 1));
    const completedTasks = Math.min(totalTasks, Math.max(0, Math.round(Number(projectForm.completedTasks) || 0)));
    const progress = Math.max(0, Math.min(100, Math.round(Number(projectForm.progress) || 0)));
    const assigneeNames = Array.from(new Set([responsibleName, ...parseCommaList(projectForm.assignees)]));

    const projectFields = {
      title,
      description,
      status: projectForm.status,
      responsible: { name: responsibleName },
      assignees: assigneeNames.map((name) => ({ name })),
      progress,
      dueDate,
      priority: projectForm.priority,
      labels: parseCommaList(projectForm.labels),
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
    if (editingProjectId === project.id) closeCreateProject();
    setAlert({ type: 'success', message: `Projet "${project.title}" supprimé.` });
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f6f4f1] text-[#172033]">
      {createProjectOpen && (
        <CreateProjectModal
          mode={editingProjectId ? 'edit' : 'create'}
          form={projectForm}
          error={projectFormError}
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
                    onProjectOpen={showProject}
                    onProjectEdit={openEditProject}
                    onProjectDuplicate={duplicateProject}
                    onProjectDelete={deleteProject}
                    onAddProject={openCreateProject}
                  />
                )}

                {viewMode === 'grid' && (
                  <GridView
                    projects={filteredProjects}
                    onProjectOpen={showProject}
                    onProjectEdit={openEditProject}
                    onProjectDuplicate={duplicateProject}
                    onProjectDelete={deleteProject}
                  />
                )}

                {viewMode === 'table' && (
                  <TableView
                    projects={filteredProjects}
                    onProjectOpen={showProject}
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
