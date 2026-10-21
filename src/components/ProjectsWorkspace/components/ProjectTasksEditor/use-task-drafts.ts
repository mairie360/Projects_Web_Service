import React from 'react';
import { civilDateInZone } from '@mairie360/lib-components/shared';
import { createPersonFromOptionValue, type FilterOption, type ProjectFormState, type TaskFormState } from '@/lib/projectPageState';
import type { Project, ProjectTask } from '@/types/project';
import { createDraftTaskId, createTaskFormStateFromProjectForm, createTaskSummaryPatch, taskToFormState, uniqueAssigneesInOrder, type TaskDraftFormState } from './task-form-state';

// Draft task form of a project being created or edited: the tasks live in the project form.
export function useTaskDrafts({ form, memberOptions, onChange }: {
  form: ProjectFormState;
  memberOptions: FilterOption[];
  onChange: (patch: Partial<ProjectFormState>) => void;
}) {
  const [taskForm, setTaskForm] = React.useState<TaskDraftFormState>(() => createTaskFormStateFromProjectForm(form));
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [taskFormError, setTaskFormError] = React.useState('');
  const taskDueDate = taskForm.dueDate ?? form.dueDate;

  React.useEffect(() => {
    setTaskForm((current) => ({
      ...current,
      status: current.title ? current.status : form.status,
      priority: current.title ? current.priority : form.priority,
    }));
  }, [form.priority, form.status]);

  const updateTaskForm = (patch: Partial<TaskFormState>) => {
    setTaskForm((current) => ({ ...current, ...patch }));
    if (taskFormError) setTaskFormError('');
  };

  const updateTasks = (taskItems: ProjectTask[]) => {
    onChange(createTaskSummaryPatch(taskItems, form.archivedTasks));
  };

  const saveTask = () => {
    const title = taskForm.title.trim();
    if (!title) {
      setTaskFormError('Le titre de la tâche est obligatoire.');
      return;
    }

    const assigneeValues = uniqueAssigneesInOrder(
      taskForm.assignees.length > 0 ? taskForm.assignees : [form.responsible]
    );
    if (assigneeValues.length === 0) {
      setTaskFormError('Choisissez un assigné pour la tâche ou un responsable pour le projet.');
      return;
    }

    const assignees = assigneeValues.map((value) => createPersonFromOptionValue(value, memberOptions));
    const responsible = assignees[0];
    const task: ProjectTask = {
      id: editingTaskId ?? createDraftTaskId(form.taskItems),
      title,
      status: taskForm.status,
      responsible,
      assignees,
      priority: taskForm.priority,
      labels: taskForm.labels,
      dueDate: taskDueDate,
      completed: taskForm.status === 'done',
      createdAt: civilDateInZone(new Date()),
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
      assignees: [],
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
    setTaskForm(createTaskFormStateFromProjectForm(form));
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

  return { taskForm, taskDueDate, editingTaskId, taskFormError, updateTaskForm, saveTask, editTask, cancelTaskEdit, toggleTask };
}
