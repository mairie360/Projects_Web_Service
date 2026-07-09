'use client';

import React from 'react';
import { Button, ToolTip } from '@mairie360/lib-components';
import { CalendarDays, CheckSquare2, CircleDot, ListChecks, Square, X } from 'lucide-react';

import {
  formatProjectDate,
  PersonAvatar,
  PriorityPill,
  ProgressMeter,
  StatusPill,
} from '../ProjectCard';
import type { Project, ProjectTask, ProjectTaskDraft } from '../../types/project';
import {
  createPersonFromOptionValue,
  createTaskFormState,
  getPersonValue,
  getUniqueValues,
  projectPriorityOptions,
  projectStatusOptions,
  projectToFormState,
  type FilterOption,
  type ProjectFormState,
  type TaskFormState,
} from '../../lib/projectPageState';
import {
  FieldLabel,
  FormField,
  MultiSelectField,
  SelectField,
  TaskEditButton,
  TextAreaField,
  fieldClassName,
} from './ProjectFormControls';
import { ProjectTasksEditor, taskToFormState } from './ProjectTasksEditor';

export function CreateProjectModal({
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
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-md bg-[#f6f4f1] shadow-[0_18px_50px_rgba(27,31,36,0.28)]"
        onSubmit={onSubmit}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[#1f1f1f] bg-[#2b2b2b] px-5 py-3">
          <h2 className="truncate text-base font-semibold text-white">
            {isEditMode ? 'Modifier le projet' : 'Nouveau projet'}
          </h2>
          <button
            type="button"
            aria-label={isEditMode ? 'Fermer la modification de projet' : 'Fermer la création de projet'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#d7e3e7] transition hover:bg-[#3a3a3a] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6aada9]/45"
            onClick={onClose}
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto bg-[#f6f4f1] p-5">
          {error && (
            <div className="mb-4 rounded-md border border-[#ffcecb] bg-[#ffebe9] px-4 py-3 text-sm font-medium text-[#cf222e]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="space-y-4">
              <div className="rounded-md border border-[#d9d5d0] bg-[#fbfaf8] p-4">
                <FormField
                  id="project-title"
                  label="Titre"
                  value={form.title}
                  required
                  placeholder="Ajouter un titre..."
                  onChange={(title) => onChange({ title })}
                />
              </div>

              <div className="overflow-hidden rounded-md border border-[#d9d5d0] bg-[#fbfaf8]">
                <div className="flex h-10 items-center border-b border-[#dedbd6] bg-[#f1eee9] px-3">
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

            <aside className="space-y-4 rounded-md border border-[#d9d5d0] bg-[#fbfaf8] p-4">
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
                <div className="rounded-md border border-[#d9d5d0] bg-white px-3 py-2">
                  <div className="text-xs font-semibold text-[#57606a]">Terminées</div>
                  <div className="mt-1 text-lg font-semibold text-[#24292f]">{form.completedTasks}</div>
                </div>
                <div className="rounded-md border border-[#d9d5d0] bg-white px-3 py-2">
                  <div className="text-xs font-semibold text-[#57606a]">Total</div>
                  <div className="mt-1 text-lg font-semibold text-[#24292f]">{form.totalTasks}</div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#dedbd6] bg-[#fbfaf8] px-5 py-3 sm:flex-row sm:justify-end">
          <Button
            label="Annuler"
            type="button"
            onClick={onClose}
            className="!h-9 !min-h-0 !rounded-md !border-[#d9d5d0] !bg-[#fbfaf8] !px-4 !text-sm !font-semibold !text-[#24292f] hover:!bg-[#f1eee9]"
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

export function ProjectDetailModal({
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
    const dueDate = projectEditForm.dueDate;

    if (!title || !description || !dueDate) {
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

    const assigneeValues = getUniqueValues(
      taskForm.assignees.length > 0 ? taskForm.assignees : [getPersonValue(project.responsible)]
    );
    const assignees = assigneeValues.map((value) => createPersonFromOptionValue(value, memberOptions));
    const taskDraft: ProjectTaskDraft = {
      title,
      status: taskForm.status,
      responsible: assignees[0] ?? project.responsible,
      assignees,
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

      <section className="relative z-10 flex h-full w-full flex-col overflow-hidden border-l border-[#d0d7de] bg-[#f6f4f1] shadow-[0_18px_50px_rgba(27,31,36,0.28)] sm:max-w-6xl sm:rounded-md sm:border">
        <header className="flex items-start justify-between gap-4 border-b border-[#dedbd6] bg-[#fbfaf8] px-5 py-4">
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

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f6f4f1]">
          <div className="grid min-h-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
            <main className="min-w-0 border-r border-[#d8dee4] p-5">
              <div className="mb-5 rounded-md border border-[#d9d5d0] bg-[#fbfaf8] p-4">
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

              <section className="overflow-hidden rounded-md border border-[#d9d5d0] bg-[#fbfaf8]">
                <div className="flex items-center justify-between border-b border-[#dedbd6] bg-[#f1eee9] px-4 py-3">
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

            <aside className="bg-[#fbfaf8] p-5">
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
