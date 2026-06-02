'use client';

import React from 'react';
import { Button } from '@mairie360/lib-components';
import { CalendarDays, CheckSquare2, ListChecks, Square } from 'lucide-react';

import {
  formatProjectDate,
  PersonAvatar,
  PriorityPill,
  StatusPill,
} from '../ProjectCard';
import type { Project, ProjectTask } from '../../types/project';
import {
  calculateProjectProgress,
  formatInputDate,
  getUniqueValues,
  projectPriorityOptions,
  projectStatusOptions,
  type FilterOption,
  type ProjectFormState,
  type TaskFormState,
} from '../../lib/projectPageState';
import {
  FieldLabel,
  MultiSelectField,
  SelectField,
  TaskEditButton,
  fieldClassName,
} from './ProjectFormControls';

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

export function taskToFormState(task: ProjectTask): TaskFormState {
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

export function ProjectTasksEditor({
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
