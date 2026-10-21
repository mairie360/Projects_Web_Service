import React from 'react';
import { getBffProjectErrorMessage } from '@/lib/bffProjectClient';
import { createDetailTaskFormState } from '@/lib/current-agent';
import { createPersonFromOptionValue, type FilterOption, type TaskFormState } from '@/lib/projectPageState';
import { NewTaskReceiptVerificationRequiredError, ProjectTaskVerificationRequiredError } from '@/lib/projectTaskVerification';
import type { TaskStatusDefinition } from '@/lib/projectWorkflow';
import type { Project, ProjectTask, ProjectTaskDraft } from '@/types/project';
import { taskToFormState, uniqueAssigneesInOrder } from '../ProjectTasksEditor';
import type { TaskCreationState } from '../TaskCreationNotice';
import { categoryOf, projectStatusHelpers } from './status-helpers';
import type { MutationLock } from './use-project-edit';

// The task form of the detail: creation draft (with the current agent as default assignee) or edit of one task.
export function useDetailTaskForm({ project, lock, memberOptions, defaultTaskAssigneeId, readCurrentTaskAssignee, taskCreationState, onPreserveTaskDraft, pendingTaskIds, unverifiedTaskIds, dynamicStatuses, onAddTask, onUpdateTask }: {
  project: Project;
  lock: MutationLock;
  memberOptions: FilterOption[];
  defaultTaskAssigneeId?: string | null;
  readCurrentTaskAssignee?: (signal: AbortSignal) => Promise<string | null>;
  taskCreationState?: TaskCreationState;
  onPreserveTaskDraft?: (patch: Partial<TaskFormState>) => void;
  pendingTaskIds?: ReadonlySet<string>;
  unverifiedTaskIds?: ReadonlySet<string>;
  dynamicStatuses: TaskStatusDefinition[] | undefined;
  onAddTask: (project: Project, task: ProjectTaskDraft) => void | Promise<void>;
  onUpdateTask: (projectId: string, taskId: string, task: ProjectTaskDraft) => void | Promise<void>;
}) {
  const newTaskForm = () => createDetailTaskFormState(project, readCurrentTaskAssignee ? null : defaultTaskAssigneeId, memberOptions);
  const [form, setForm] = React.useState<TaskFormState>(() => taskCreationState?.draft ?? newTaskForm());
  const touchedRef = React.useRef(!!taskCreationState?.draft);
  const agentReadRef = React.useRef<AbortController | null>(null);
  const [resetRevision, setResetRevision] = React.useState(0);
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');
  const [verificationError, setVerificationError] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (!readCurrentTaskAssignee || editingTaskId || touchedRef.current || project.permissions?.canCreateTask === false) return;
    const controller = new AbortController();
    agentReadRef.current = controller;
    setForm(current => ({ ...current, assignees: [] }));
    void readCurrentTaskAssignee(controller.signal).then(id => {
      if (controller.signal.aborted || touchedRef.current || agentReadRef.current !== controller) return;
      const selectable = id && memberOptions.filter(member => String(member.value) === id).length === 1;
      setForm(current => ({ ...current, assignees: selectable ? [id] : [] }));
    }).catch(() => undefined);
    return () => controller.abort();
  }, [readCurrentTaskAssignee, memberOptions, project.id, project.permissions?.canCreateTask, editingTaskId, resetRevision]);
  const noticeRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (taskCreationState?.uncertainTitle && !saving && !editingTaskId) noticeRef.current?.focus();
  }, [taskCreationState?.uncertainTitle, saving, editingTaskId]);
  const { firstStatusOf, categoryStatus } = projectStatusHelpers(dynamicStatuses);

  // A same-project refresh must not discard an unsaved task or its retry.
  const resetForProject = () => {
    agentReadRef.current?.abort();
    touchedRef.current = !!taskCreationState?.draft;
    setResetRevision(current => current + 1);
    setForm(taskCreationState?.draft ?? newTaskForm());
    setEditingTaskId(null);
    setError('');
  };

  const update = (patch: Partial<TaskFormState>) => {
    touchedRef.current = true;
    agentReadRef.current?.abort();
    setForm((current) => ({ ...current, ...patch }));
    if (!editingTaskId && taskCreationState?.uncertainTitle) onPreserveTaskDraft?.(patch);
    if (error) setError('');
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lock.current.task || lock.current.project) return;
    if (!editingTaskId && (taskCreationState?.pending || taskCreationState?.uncertainTitle)) return;
    if (editingTaskId && pendingTaskIds?.has(editingTaskId)) return;
    if (editingTaskId && unverifiedTaskIds?.has(editingTaskId)) return;
    touchedRef.current = true;
    agentReadRef.current?.abort();
    setVerificationError(false);

    const title = form.title.trim();
    if (!title) {
      setError('Le titre de la tâche est obligatoire.');
      return;
    }

    // Without an explicit choice, a task takes the project's first status of its form category.
    const formStatusId = dynamicStatuses && dynamicStatuses.some(status => status.id === form.statusId) ? form.statusId : firstStatusOf(categoryOf(form.status));
    if (dynamicStatuses && !formStatusId) {
      setError('Choisissez un statut du projet pour la tâche.');
      return;
    }

    if (!form.assignees.length) {
      setError('Choisissez au moins un agent assigné à cette tâche.');
      return;
    }
    const assigneeValues = uniqueAssigneesInOrder(form.assignees);
    const assignees = assigneeValues.map((value) => createPersonFromOptionValue(value, memberOptions));
    const taskDraft: ProjectTaskDraft = {
      title,
      status: dynamicStatuses ? categoryStatus(formStatusId ?? '') : form.status,
      ...(dynamicStatuses ? { statusId: formStatusId } : {}),
      responsible: assignees[0],
      assignees,
      priority: form.priority,
      labels: form.labels,
      dueDate: form.dueDate,
    };

    lock.current.task = true;
    setSaving(true);
    setError('');
    try {
      if (editingTaskId) {
        await onUpdateTask(project.id, editingTaskId, taskDraft);
      } else {
        await onAddTask(project, taskDraft);
      }
      setForm(newTaskForm());
      touchedRef.current = false;
      setResetRevision(current => current + 1);
      setEditingTaskId(null);
    } catch (error) {
      setError(getBffProjectErrorMessage(error));
      setVerificationError(error instanceof ProjectTaskVerificationRequiredError || error instanceof NewTaskReceiptVerificationRequiredError);
    } finally {
      lock.current.task = false;
      setSaving(false);
    }
  };

  const edit = (task: ProjectTask) => {
    if (lock.current.task || lock.current.project || pendingTaskIds?.has(task.id) || unverifiedTaskIds?.has(task.id)) return;
    touchedRef.current = true;
    agentReadRef.current?.abort();
    setForm(taskToFormState(task));
    setEditingTaskId(task.id);
    setError('');
  };

  const cancel = () => {
    if (lock.current.task || lock.current.project) return;
    agentReadRef.current?.abort();
    touchedRef.current = !!taskCreationState?.draft;
    setForm(taskCreationState?.draft ?? newTaskForm());
    setResetRevision(current => current + 1);
    setEditingTaskId(null);
    setError('');
  };

  const statusValue = dynamicStatuses ? (dynamicStatuses.some(status => status.id === form.statusId) ? form.statusId : firstStatusOf(categoryOf(form.status))) ?? '' : form.status;
  const missingDefaultStatus = !!dynamicStatuses && !firstStatusOf(categoryOf(form.status));
  const submitDisabled = editingTaskId ? (!!pendingTaskIds?.has(editingTaskId) || !!unverifiedTaskIds?.has(editingTaskId)) : !!(taskCreationState?.pending || taskCreationState?.uncertainTitle);
  const visibleError = error && (!verificationError || (!!editingTaskId && !!unverifiedTaskIds?.has(editingTaskId))) ? error : undefined;
  const onStatusChange = (status: string) => update(dynamicStatuses ? { statusId: status, status: categoryStatus(status) } : { status: status as Project['status'] });

  return { form, editingTaskId, error: visibleError, saving, noticeRef, statusValue, missingDefaultStatus, submitDisabled, update, onStatusChange, submit, edit, cancel, resetForProject };
}
