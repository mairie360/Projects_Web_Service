import React from 'react';
import { getBffProjectErrorMessage } from '@/lib/bffProjectClient';
import { createDetailTaskFormState } from '@/lib/current-agent';
import { createPersonFromOptionValue, TASK_START_AFTER_DUE, taskStartAfterDue, taskStatusOf, type FilterOption, type TaskFormState } from '@/lib/projectPageState';
import { NewTaskReceiptVerificationRequiredError, ProjectTaskVerificationRequiredError } from '@/lib/projectTaskVerification';
import type { TaskStatusDefinition } from '@/lib/projectWorkflow';
import type { Project, ProjectTask, ProjectTaskDraft } from '@/types/project';
import { taskToFormState, uniqueAssigneesInOrder } from '../ProjectTasksEditor';
import type { TaskCreationState } from '../TaskCreationNotice';
import { categoryOf, projectStatusHelpers } from './status-helpers';
import type { MutationLock } from './use-project-edit';

/** Column of the task board (MAIR-859): the status a task created or moved there takes. */
export type TaskColumnStatus = 'todo' | 'in-progress' | 'done';

/** MAIR-859 (C5): the only field the sheet requires before any write. */
export const TASK_TITLE_REQUIRED = 'Donnez un titre à la tâche';

// The task sheet (MAIR-859): creation draft (with the current agent as default assignee) or edit of one task, in a
// window (lib Modal, MAIR-1137) opened by « Nouvelle tâche » or « Modifier »; the board quick add goes through the same writes.
export function useDetailTaskForm({ project, lockRef, memberOptions, defaultTaskAssigneeId, readCurrentTaskAssignee, taskCreationState, onPreserveTaskDraft, pendingTaskIds, unverifiedTaskIds, dynamicStatuses, onAddTask, onUpdateTask }: {
  project: Project;
  lockRef: MutationLock;
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
  const [titleError, setTitleError] = React.useState('');
  const [open, setOpen] = React.useState(false);
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
    setOpen(false);
    setError('');
    setTitleError('');
  };

  const update = (patch: Partial<TaskFormState>) => {
    touchedRef.current = true;
    agentReadRef.current?.abort();
    setForm((current) => ({ ...current, ...patch }));
    if (!editingTaskId && taskCreationState?.uncertainTitle) onPreserveTaskDraft?.(patch);
    if (error) setError('');
    if (titleError && patch.title?.trim()) setTitleError('');
  };

  const categoryColumn = (status: Project['status']): TaskColumnStatus => (status === 'done' || status === 'in-progress' ? status : 'todo');

  const columnPatch = (status: TaskColumnStatus): Pick<TaskFormState, 'status' | 'statusId'> => {
    const statusId = firstStatusOf(categoryOf(status));
    return { status, ...(dynamicStatuses && statusId ? { statusId } : { statusId: undefined }) };
  };

  /** Checks a form and writes it; `true` once the BFF confirmed it. The refusals stay in the sheet. */
  const persist = async (submitted: TaskFormState, taskId: string | null): Promise<boolean> => {
    if (lockRef.current.task || lockRef.current.project) return false;
    if (!taskId && (taskCreationState?.pending || taskCreationState?.uncertainTitle)) return false;
    if (taskId && pendingTaskIds?.has(taskId)) return false;
    if (taskId && unverifiedTaskIds?.has(taskId)) return false;
    touchedRef.current = true;
    agentReadRef.current?.abort();
    setVerificationError(false);

    const title = submitted.title.trim();
    if (!title) {
      setTitleError(TASK_TITLE_REQUIRED);
      return false;
    }
    if (taskStartAfterDue(submitted)) {
      setError(TASK_START_AFTER_DUE);
      return false;
    }

    // Without an explicit choice, a task takes the project's first status of its form category.
    const formStatusId = dynamicStatuses && dynamicStatuses.some(status => status.id === submitted.statusId) ? submitted.statusId : firstStatusOf(categoryOf(submitted.status));
    if (dynamicStatuses && !formStatusId) {
      setError('Choisissez un statut du projet pour la tâche.');
      return false;
    }

    if (!submitted.assignees.length) {
      setError('Choisissez au moins un agent assigné à cette tâche.');
      return false;
    }
    const assigneeValues = uniqueAssigneesInOrder(submitted.assignees);
    const assignees = assigneeValues.map((value) => createPersonFromOptionValue(value, memberOptions));
    const taskDraft: ProjectTaskDraft = {
      title,
      ...(submitted.description !== undefined ? { description: submitted.description } : {}),
      status: dynamicStatuses ? categoryStatus(formStatusId ?? '') : taskStatusOf(submitted.status),
      ...(dynamicStatuses ? { statusId: formStatusId } : {}),
      responsible: assignees[0],
      assignees,
      priority: submitted.priority,
      labels: submitted.labels,
      dueDate: submitted.dueDate,
      // MAIR-1087: kept as typed; an empty start date is « none » (cleared on an edit).
      ...(submitted.startDate !== undefined ? { startDate: submitted.startDate } : {}),
    };

    lockRef.current.task = true;
    setSaving(true);
    setError('');
    setTitleError('');
    try {
      if (taskId) {
        await onUpdateTask(project.id, taskId, taskDraft);
      } else {
        await onAddTask(project, taskDraft);
      }
      setForm(newTaskForm());
      touchedRef.current = false;
      setResetRevision(current => current + 1);
      setEditingTaskId(null);
      setOpen(false);
      return true;
    } catch (error) {
      setError(getBffProjectErrorMessage(error));
      setVerificationError(error instanceof ProjectTaskVerificationRequiredError || error instanceof NewTaskReceiptVerificationRequiredError);
      return false;
    } finally {
      lockRef.current.task = false;
      setSaving(false);
    }
  };

  /**
   * MAIR-1137 (C12): « Ajouter et continuer » (`continueAfter`) opens a new creation once the task is saved, for a
   * chain of tasks.
   */
  const submit = async (event: React.FormEvent<HTMLFormElement>, { continueAfter = false }: { continueAfter?: boolean } = {}) => {
    event.preventDefault();
    const saved = await persist(form, editingTaskId);
    if (saved && continueAfter && !editingTaskId) {
      setForm((current) => ({ ...current, ...columnPatch(categoryColumn(form.status)) }));
      setOpen(true);
    }
    return saved;
  };

  /** MAIR-1137 (C15): « Dupliquer » of the task page writes a copy of the task in the same state. */
  const duplicate = (task: ProjectTask) => persist({ ...taskToFormState(task), title: `${task.title} (copie)` }, null);

  /** « Nouvelle tâche » (C5) or the « + » of a column (C3, with its status): the creation sheet. */
  const openCreate = (status: TaskColumnStatus = 'todo', title = '') => {
    if (lockRef.current.task || lockRef.current.project) return;
    if (taskCreationState?.draft) setForm(taskCreationState.draft);
    else if (editingTaskId) {
      // An earlier edit leaves its fields: a new sheet starts from the defaults and reads the current agent again.
      touchedRef.current = false;
      setResetRevision(current => current + 1);
      setForm({ ...newTaskForm(), title, ...columnPatch(status) });
    } else setForm(current => ({ ...current, ...(title ? { title } : {}), ...columnPatch(status) }));
    setEditingTaskId(null);
    setError('');
    setTitleError('');
    setOpen(true);
  };

  /**
   * C3 quick add: the column's status and the creation defaults (current agent as assignee). Without a default
   * assignee the sheet opens with the title, since a task needs one; `'sheet'` tells the column to close its field.
   */
  const quickAdd = async (title: string, status: TaskColumnStatus): Promise<'added' | 'sheet' | 'refused'> => {
    if (!title.trim()) {
      setTitleError(TASK_TITLE_REQUIRED);
      return 'refused';
    }
    const draft: TaskFormState = { ...newTaskForm(), ...(form.assignees.length && !editingTaskId ? { assignees: form.assignees } : {}), title, ...columnPatch(status) };
    if (!draft.assignees.length) {
      openCreate(status, title);
      return 'sheet';
    }
    if (await persist(draft, null)) return 'added';
    // The refusal is shown in the sheet, which keeps the typed task for a retry.
    setForm(draft);
    setEditingTaskId(null);
    setOpen(true);
    return 'sheet';
  };

  // MAIR-859: the sheet of a pending or unverified task opens too (read it); its save stays disabled (`submitDisabled`).
  const edit = (task: ProjectTask) => {
    if (lockRef.current.task || lockRef.current.project) return;
    touchedRef.current = true;
    agentReadRef.current?.abort();
    setForm(taskToFormState(task));
    setEditingTaskId(task.id);
    setError('');
    setTitleError('');
    setOpen(true);
  };

  const cancel = () => {
    if (lockRef.current.task || lockRef.current.project) return;
    agentReadRef.current?.abort();
    touchedRef.current = !!taskCreationState?.draft;
    setForm(taskCreationState?.draft ?? newTaskForm());
    setResetRevision(current => current + 1);
    setEditingTaskId(null);
    setOpen(false);
    setError('');
    setTitleError('');
  };

  const statusValue = dynamicStatuses ? (dynamicStatuses.some(status => status.id === form.statusId) ? form.statusId : firstStatusOf(categoryOf(form.status))) ?? '' : form.status;
  const missingDefaultStatus = !!dynamicStatuses && !firstStatusOf(categoryOf(form.status));
  const submitDisabled = editingTaskId ? (!!pendingTaskIds?.has(editingTaskId) || !!unverifiedTaskIds?.has(editingTaskId)) : !!(taskCreationState?.pending || taskCreationState?.uncertainTitle);
  const visibleError = error && (!verificationError || (!!editingTaskId && !!unverifiedTaskIds?.has(editingTaskId))) ? error : undefined;
  const onStatusChange = (status: string) => update(dynamicStatuses ? { statusId: status, status: categoryStatus(status) } : { status: taskStatusOf(status as Project['status']) });

  return { form, open, editingTaskId, error: visibleError, titleError, saving, noticeRef, statusValue, missingDefaultStatus, submitDisabled, update, onStatusChange, submit, duplicate, openCreate, quickAdd, edit, cancel, resetForProject };
}
