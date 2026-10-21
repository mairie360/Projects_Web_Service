'use client';

import { ProjectWorkflow } from './ProjectWorkflow';
import { canManageWorkflow, type ProjectWorkflowPort, type ProjectWorkflowSnapshot } from '../../lib/projectWorkflow';
import React from 'react';
import { createDetailTaskFormState } from '../../lib/current-agent';
import { NewTaskReceiptVerificationRequiredError, ProjectTaskVerificationRequiredError } from '../../lib/projectTaskVerification';
import { TaskCreationNotice, type TaskCreationState } from './TaskCreationNotice';
import { ProjectReceiptVerificationRequiredError } from '../../lib/projectReceiptVerification';
import { ListChecks } from 'lucide-react';
import type { Project, ProjectStatus, ProjectTask, ProjectTaskDraft, TaskCollaboration, TaskComment } from '../../types/project';
import { addTaskComment, getBffProjectErrorMessage, getTaskCollaboration } from '../../lib/bffProjectClient';
import { archivedTasksLabel, createPersonFromOptionValue, getPersonValue, projectToFormState, type FilterOption, type ProjectFormState, type TaskFormState } from '../../lib/projectPageState';
import { DetailHeader } from './project-detail/DetailHeader';
import { DetailRefreshAlert } from './project-detail/DetailRefreshAlert';
import { ProjectEditForm } from './project-detail/ProjectEditForm';
import { ProjectLifecycle } from './project-detail/ProjectLifecycle';
import { ProjectSummary } from './project-detail/ProjectSummary';
import { TaskDeleteConfirm } from './project-detail/TaskDeleteConfirm';
import { TaskFilters } from './project-detail/TaskFilters';
import { TaskFollowUp } from './project-detail/TaskFollowUp';
import { TaskFormPanel } from './project-detail/TaskFormPanel';
import { TaskRow } from './project-detail/TaskRow';
import { taskToFormState, uniqueAssigneesInOrder } from './ProjectTasksEditor';

type TaskFollowUpSelection = {
  projectId: string;
  taskId: string;
  confirmedComments: TaskComment[];
  loading: boolean;
};

export function ProjectDetailModal({
  project,
  workflowPort,
  onMoveWorkflowTask,
  onSaveWorkflowStatuses,
  workflowRole,
  defaultTaskAssigneeId,
  readCurrentTaskAssignee,
  tasks,
  highlightTaskId,
  memberOptions,
  labelOptions,
  statusOptions,
  priorityOptions,
  onClose,
  refreshError = '',
  refreshPending = false,
  projectVerificationRequired = false,
  projectVerificationPending = false,
  pendingTaskIds,
  taskWriteErrors,
  unverifiedTaskIds,
  taskCreationState,
  onInspectTaskCreation,
  onPreserveTaskDraft,
  onRetry,
  onUpdateProject,
  onAddTask,
  onUpdateTask,
  onUpdateTaskStatus,
  onDeleteTask,
  onCloseProject,
}: {
  project: Project;
  workflowPort?: ProjectWorkflowPort;
  /** Controller-owned workflow writes (MAIR-570); without them the panel writes through the port. */
  onMoveWorkflowTask?: ProjectWorkflowPort['moveTask'];
  onSaveWorkflowStatuses?: ProjectWorkflowPort['saveProjectStatuses'];
  workflowRole?: string;
  defaultTaskAssigneeId?: string | null;
  readCurrentTaskAssignee?: (signal: AbortSignal) => Promise<string | null>;
  tasks: ProjectTask[];
  highlightTaskId?: string | null;
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  onClose: () => void;
  refreshError?: string;
  refreshPending?: boolean;
  projectVerificationRequired?: boolean;
  projectVerificationPending?: boolean;
  pendingTaskIds?: ReadonlySet<string>;
  taskWriteErrors?: ReadonlyMap<string, string>;
  unverifiedTaskIds?: ReadonlySet<string>;
  taskCreationState?: TaskCreationState;
  onInspectTaskCreation?: () => void | Promise<void>;
  onPreserveTaskDraft?: (patch: Partial<TaskFormState>) => void;
  onRetry?: () => void | Promise<void>;
  onUpdateProject: (projectId: string, form: ProjectFormState) => void | Promise<void>;
  onAddTask: (project: Project, task: ProjectTaskDraft) => void | Promise<void>;
  onUpdateTask: (projectId: string, taskId: string, task: ProjectTaskDraft) => void | Promise<void>;
  onUpdateTaskStatus: (projectId: string, taskId: string, status: ProjectStatus, statusId?: string) => void | Promise<void>;
  onDeleteTask: (projectId: string, taskId: string, taskTitle: string) => Promise<void>;
  onCloseProject: (projectId: string, status: 'done' | 'review') => Promise<void>;
}) {
  const [workflow, setWorkflow] = React.useState<ProjectWorkflowSnapshot | null>(null);
  const receiveWorkflow = React.useCallback((snapshot: ProjectWorkflowSnapshot) => setWorkflow(snapshot), []);
  const dynamicStatuses = workflow?.projectId === project.id ? workflow.statuses : undefined;
  const taskStatusOptions = dynamicStatuses?.map(status => ({ value: status.id, label: status.name })) ?? statusOptions;
  // The detailed task list (follow-up, comments, task links) stays visible by default; the button only hides it.
  const [showTaskDetails, setShowTaskDetails] = React.useState(true);
  const firstStatusOf = (category: 'todo' | 'inprogress' | 'done') => dynamicStatuses?.find(status => status.category === category)?.id;
  const categoryOf = (status: ProjectStatus) => status === 'done' ? 'done' as const : status === 'todo' ? 'todo' as const : 'inprogress' as const;
  const categoryStatus = (id: string): ProjectStatus => {
    const category = dynamicStatuses?.find(status => status.id === id)?.category;
    return category === 'inprogress' ? 'in-progress' : category ?? 'todo';
  };
  const [editingProject, setEditingProject] = React.useState(false);
  const [projectEditForm, setProjectEditForm] = React.useState<ProjectFormState>(() => projectToFormState(project));
  const [projectEditError, setProjectEditError] = React.useState('');
  const [projectEditVerificationError, setProjectEditVerificationError] = React.useState(false);
  const [projectSaving, setProjectSaving] = React.useState(false);
  const projectSavingRef = React.useRef(false);
  const projectEditIdRef = React.useRef(project.id);
  const editingProjectRef = React.useRef(false);
  const newTaskForm = () => createDetailTaskFormState(project, readCurrentTaskAssignee ? null : defaultTaskAssigneeId, memberOptions);
  const [taskForm, setTaskForm] = React.useState<TaskFormState>(() => taskCreationState?.draft ?? newTaskForm());
  const taskDraftTouchedRef = React.useRef(!!taskCreationState?.draft);
  const agentReadRef = React.useRef<AbortController | null>(null);
  const [taskResetRevision, setTaskResetRevision] = React.useState(0);
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [taskFormError, setTaskFormError] = React.useState('');
  const [taskFormVerificationError, setTaskFormVerificationError] = React.useState(false);
  const [taskSaving, setTaskSaving] = React.useState(false);
  const taskSavingRef = React.useRef(false);
  React.useEffect(() => {
    if (!readCurrentTaskAssignee || editingTaskId || taskDraftTouchedRef.current || project.permissions?.canCreateTask === false) return;
    const controller = new AbortController();
    agentReadRef.current = controller;
    setTaskForm(current => ({ ...current, assignees: [] }));
    void readCurrentTaskAssignee(controller.signal).then(id => {
      if (controller.signal.aborted || taskDraftTouchedRef.current || agentReadRef.current !== controller) return;
      const selectable = id && memberOptions.filter(member => String(member.value) === id).length === 1;
      setTaskForm(current => ({ ...current, assignees: selectable ? [id] : [] }));
    }).catch(() => undefined);
    return () => controller.abort();
  }, [readCurrentTaskAssignee, memberOptions, project.id, project.permissions?.canCreateTask, editingTaskId, taskResetRevision]);
  const taskCreationNoticeRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (taskCreationState?.uncertainTitle && !taskSaving && !editingTaskId) taskCreationNoticeRef.current?.focus();
  }, [taskCreationState?.uncertainTitle, taskSaving, editingTaskId]);
  const taskProjectIdRef = React.useRef(project.id);
  const officialProjectRef = React.useRef<Project | null>(null);
  const [taskSearch, setTaskSearch] = React.useState('');
  const [taskStatusFilter, setTaskStatusFilter] = React.useState('all');
  const [taskPriorityFilter, setTaskPriorityFilter] = React.useState('all');
  const [taskDueFilter, setTaskDueFilter] = React.useState('');
  const [deletingTaskId, setDeletingTaskId] = React.useState<string | null>(null);
  const [collaborationTaskId, setCollaborationTaskId] = React.useState<string | null>(null);
  const [collaboration, setCollaboration] = React.useState<TaskCollaboration | null>(null);
  const [collaborationLoading, setCollaborationLoading] = React.useState(false);
  const [collaborationError, setCollaborationError] = React.useState('');
  const [commentMessage, setCommentMessage] = React.useState('');
  const [commentSaving, setCommentSaving] = React.useState(false);
  const collaborationSelectionRef = React.useRef<TaskFollowUpSelection | null>(null);
  const collaborationReadRef = React.useRef(0);
  const commentRequestRef = React.useRef<symbol | null>(null);
  const highlightedTaskRef = React.useRef<HTMLElement | null>(null);
  const focusedLinkedTaskRef = React.useRef<HTMLElement | null>(null);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const dialogRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const titleId = React.useId();
  const responsibleOptions = [{ label: 'Sélectionner un assigné', value: '' }, ...memberOptions];
  const mutationPending = projectSaving || taskSaving;
  const closeDetail = () => {
    if (!projectSavingRef.current && !taskSavingRef.current) onClose();
  };

  React.useLayoutEffect(() => {
    const opener = typeof HTMLElement !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const overlay = overlayRef.current;
    dialogRef.current?.focus();

    return () => {
      if (opener?.isConnected && (overlay?.contains(document.activeElement) || document.activeElement === document.body)) {
        opener.focus();
      }
    };
  }, []);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeDetail();
      return;
    }
    if (event.key !== 'Tab') return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => {
      const style = window.getComputedStyle(element);
      return element.tabIndex >= 0 && !element.matches(':disabled') && !element.hasAttribute('hidden') &&
        element.getAttribute('aria-hidden') !== 'true' && style.display !== 'none' && style.visibility !== 'hidden';
    });
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const filteredTasks = React.useMemo(() => {
    const search = taskSearch.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch = !search || task.title.toLowerCase().includes(search) ||
        task.labels.some((label) => label.toLowerCase().includes(search));
      const matchesStatus = taskStatusFilter === 'all' || (dynamicStatuses ? task.statusId : task.status) === taskStatusFilter;
      const matchesPriority = taskPriorityFilter === 'all' || task.priority === taskPriorityFilter;
      const matchesDueDate = !taskDueFilter || task.dueDate.slice(0, 10) <= taskDueFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesDueDate;
    });
  }, [dynamicStatuses, taskDueFilter, taskPriorityFilter, taskSearch, taskStatusFilter, tasks]);

  React.useEffect(() => {
    // Retained input changes are not a new official project response: do not
    // reset task searches/filters or unrelated editors on each keystroke.
    if (officialProjectRef.current === project) return;
    officialProjectRef.current = project;
    const projectChanged = taskProjectIdRef.current !== project.id;
    // Official refreshes update defaults, never an active same-project draft.
    if (projectEditIdRef.current !== project.id || !editingProjectRef.current) {
      projectEditIdRef.current = project.id;
      editingProjectRef.current = false;
      setProjectEditForm(projectToFormState(project));
      setProjectEditError('');
      setEditingProject(false);
    }
    // A same-project refresh must not discard an unsaved task or its retry.
    if (projectChanged) {
      agentReadRef.current?.abort();
      taskDraftTouchedRef.current = !!taskCreationState?.draft;
      setTaskResetRevision(current => current + 1);
      taskProjectIdRef.current = project.id;
      setTaskForm(taskCreationState?.draft ?? newTaskForm());
      setEditingTaskId(null);
      setTaskFormError('');
      collaborationSelectionRef.current = null;
      collaborationReadRef.current += 1;
      setCollaborationTaskId(null);
      setCollaboration(null);
      setCollaborationLoading(false);
      setCollaborationError('');
      setCommentMessage('');
    }
    setTaskSearch('');
    setTaskStatusFilter('all');
    setTaskPriorityFilter('all');
    setTaskDueFilter('');
    setDeletingTaskId(null);
  }, [project, taskCreationState?.draft]);

  React.useEffect(() => () => {
    collaborationSelectionRef.current = null;
    collaborationReadRef.current += 1;
    commentRequestRef.current = null;
  }, []);

  React.useLayoutEffect(() => {
    const article = highlightedTaskRef.current;
    if (!highlightTaskId) {
      focusedLinkedTaskRef.current = null;
      return;
    }
    if (!article || focusedLinkedTaskRef.current === article) return;
    const content = contentRef.current;
    if (!content) return;
    const target = article.getBoundingClientRect();
    const viewport = content.getBoundingClientRect();
    const scrollTop = content.scrollTop;
    const availableHeight = content.clientHeight;
    // Scroll only the detail body: scrollIntoView also moves the outer dialog
    // and can hide its fixed header and close button.
    content.scrollTop = scrollTop + target.top - viewport.top - Math.max(0, (availableHeight - target.height) / 2);
    article.focus?.({ preventScroll: true });
    focusedLinkedTaskRef.current = article;
  }, [filteredTasks, highlightTaskId]);

  const loadTaskCollaboration = async (selection: TaskFollowUpSelection) => {
    if (collaborationSelectionRef.current !== selection) return;
    const read = ++collaborationReadRef.current;
    selection.loading = true;
    setCollaborationError('');
    setCollaborationLoading(true);
    const isCurrent = () => collaborationSelectionRef.current === selection && collaborationReadRef.current === read;
    try {
      const received = await getTaskCollaboration(selection.projectId, selection.taskId);
      if (!isCurrent()) return;
      // The POST response is already authoritative, even if the following read
      // temporarily fails or has not caught up with the confirmed comment yet.
      const receivedIds = new Set(received.comments.map((comment) => comment.id));
      setCollaboration({
        ...received,
        comments: [...received.comments, ...selection.confirmedComments.filter((comment) => !receivedIds.has(comment.id))],
      });
    } catch (error) {
      if (isCurrent()) {
        const prefix = selection.confirmedComments.length ? 'Commentaire enregistré. Actualisation impossible : ' : '';
        setCollaborationError(`${prefix}${getBffProjectErrorMessage(error)}`);
      }
    } finally {
      if (isCurrent()) {
        selection.loading = false;
        setCollaborationLoading(false);
      }
    }
  };

  const openTaskCollaboration = async (taskId: string) => {
    if (collaborationSelectionRef.current?.taskId === taskId) {
      collaborationSelectionRef.current = null;
      collaborationReadRef.current += 1;
      setCollaborationTaskId(null);
      setCollaborationLoading(false);
      return;
    }

    const selection: TaskFollowUpSelection = { projectId: project.id, taskId, confirmedComments: [], loading: false };
    collaborationSelectionRef.current = selection;
    setCollaborationTaskId(taskId);
    setCollaboration(null);
    setCollaborationError('');
    setCommentMessage('');
    await loadTaskCollaboration(selection);
  };

  const submitComment = async (event: React.FormEvent<HTMLFormElement>, taskId: string) => {
    event.preventDefault();
    const message = commentMessage.trim();
    const selection = collaborationSelectionRef.current;
    if (!message || commentRequestRef.current || !selection || selection.taskId !== taskId || selection.loading ||
      tasks.find((task) => task.id === taskId)?.permissions?.canComment === false) return;

    const request = Symbol('comment-request');
    commentRequestRef.current = request;
    setCommentSaving(true);
    setCollaborationError('');
    try {
      const confirmed = await addTaskComment(selection.projectId, taskId, message);
      if (collaborationSelectionRef.current !== selection) return;
      selection.confirmedComments = [...selection.confirmedComments.filter((comment) => comment.id !== confirmed.id), confirmed];
      setCollaboration((current) => ({
        ...(current ?? { history: [], pagination: { page: 1, limit: 50, commentsTotal: 0, historyTotal: 0, hasNextPage: false } }),
        comments: [...(current?.comments ?? []).filter((comment) => comment.id !== confirmed.id), confirmed],
      }));
      setCommentMessage('');
      await loadTaskCollaboration(selection);
    } catch (error) {
      if (collaborationSelectionRef.current === selection) setCollaborationError(getBffProjectErrorMessage(error));
    } finally {
      if (commentRequestRef.current === request) {
        commentRequestRef.current = null;
        setCommentSaving(false);
      }
    }
  };

  const updateProjectEditForm = (patch: Partial<ProjectFormState>) => {
    if (projectSavingRef.current) return;
    setProjectEditForm((current) => ({ ...current, ...patch }));
    if (projectEditError) setProjectEditError('');
  };

  const updateTaskForm = (patch: Partial<TaskFormState>) => {
    taskDraftTouchedRef.current = true;
    agentReadRef.current?.abort();
    setTaskForm((current) => ({ ...current, ...patch }));
    if (!editingTaskId && taskCreationState?.uncertainTitle) onPreserveTaskDraft?.(patch);
    if (taskFormError) setTaskFormError('');
  };

  const cancelProjectEdit = () => {
    if (projectSavingRef.current || taskSavingRef.current) return;
    // Keep keyboard navigation in the detail before its focused form disappears.
    dialogRef.current?.focus({ preventScroll: true });
    setProjectEditForm(projectToFormState(project));
    setProjectEditError('');
    editingProjectRef.current = false;
    setEditingProject(false);
  };

  const toggleProjectEdit = () => {
    if (projectSavingRef.current || taskSavingRef.current) return;
    if (editingProjectRef.current) {
      cancelProjectEdit();
    } else {
      setProjectEditForm(projectToFormState(project));
      setProjectEditError('');
      editingProjectRef.current = true;
      setEditingProject(true);
    }
  };

  const submitProjectEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (projectSavingRef.current || taskSavingRef.current || projectVerificationRequired || projectVerificationPending) return;
    setProjectEditVerificationError(false);

    const title = projectEditForm.title.trim();
    const description = projectEditForm.description.trim();
    const dueDate = projectEditForm.dueDate;

    if (!title || !description || !dueDate) {
      setProjectEditError('Les champs obligatoires doivent être renseignés.');
      return;
    }

    projectSavingRef.current = true;
    setProjectSaving(true);
    setProjectEditError('');
    try {
      await onUpdateProject(project.id, projectEditForm);
      dialogRef.current?.focus({ preventScroll: true });
      editingProjectRef.current = false;
      setEditingProject(false);
    } catch (error) {
      setProjectEditVerificationError(error instanceof ProjectReceiptVerificationRequiredError);
      setProjectEditError(getBffProjectErrorMessage(error));
    } finally {
      projectSavingRef.current = false;
      setProjectSaving(false);
    }
  };

  const submitTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (taskSavingRef.current || projectSavingRef.current) return;
    if (!editingTaskId && (taskCreationState?.pending || taskCreationState?.uncertainTitle)) return;
    if (editingTaskId && pendingTaskIds?.has(editingTaskId)) return;
    if (editingTaskId && unverifiedTaskIds?.has(editingTaskId)) return;
    taskDraftTouchedRef.current = true;
    agentReadRef.current?.abort();
    setTaskFormVerificationError(false);

    const title = taskForm.title.trim();
    if (!title) {
      setTaskFormError('Le titre de la tâche est obligatoire.');
      return;
    }

    // Without an explicit choice, a task takes the project's first status of its form category.
    const formStatusId = dynamicStatuses && dynamicStatuses.some(status => status.id === taskForm.statusId) ? taskForm.statusId : firstStatusOf(categoryOf(taskForm.status));
    if (dynamicStatuses && !formStatusId) {
      setTaskFormError('Choisissez un statut du projet pour la tâche.');
      return;
    }

    if (!taskForm.assignees.length) {
      setTaskFormError('Choisissez au moins un agent assigné à cette tâche.');
      return;
    }
    const assigneeValues = uniqueAssigneesInOrder(taskForm.assignees);
    const assignees = assigneeValues.map((value) => createPersonFromOptionValue(value, memberOptions));
    const taskDraft: ProjectTaskDraft = {
      title,
      status: dynamicStatuses ? categoryStatus(formStatusId ?? '') : taskForm.status,
      ...(dynamicStatuses ? { statusId: formStatusId } : {}),
      responsible: assignees[0],
      assignees,
      priority: taskForm.priority,
      labels: taskForm.labels,
      dueDate: taskForm.dueDate,
    };

    taskSavingRef.current = true;
    setTaskSaving(true);
    setTaskFormError('');
    try {
      if (editingTaskId) {
        await onUpdateTask(project.id, editingTaskId, taskDraft);
      } else {
        await onAddTask(project, taskDraft);
      }
      setTaskForm(newTaskForm());
      taskDraftTouchedRef.current = false;
      setTaskResetRevision(current => current + 1);
      setEditingTaskId(null);
    } catch (error) {
      setTaskFormError(getBffProjectErrorMessage(error));
      setTaskFormVerificationError(error instanceof ProjectTaskVerificationRequiredError || error instanceof NewTaskReceiptVerificationRequiredError);
    } finally {
      taskSavingRef.current = false;
      setTaskSaving(false);
    }
  };

  const editTask = (task: ProjectTask) => {
    if (taskSavingRef.current || projectSavingRef.current || pendingTaskIds?.has(task.id) || unverifiedTaskIds?.has(task.id)) return;
    taskDraftTouchedRef.current = true;
    agentReadRef.current?.abort();
    setTaskForm(taskToFormState(task));
    setEditingTaskId(task.id);
    setTaskFormError('');
  };

  const cancelTaskEdit = () => {
    if (taskSavingRef.current || projectSavingRef.current) return;
    agentReadRef.current?.abort();
    taskDraftTouchedRef.current = !!taskCreationState?.draft;
    setTaskForm(taskCreationState?.draft ?? newTaskForm());
    setTaskResetRevision(current => current + 1);
    setEditingTaskId(null);
    setTaskFormError('');
  };

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[75] flex items-stretch justify-end bg-black/45 p-0 sm:p-4">
      <button type="button" aria-hidden="true" tabIndex={-1} disabled={mutationPending} className="absolute inset-0" onClick={closeDetail} />

      {/* Clip rather than hide overflow: native field focus must scroll only the body, never this header-bearing container. */}
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={handleDialogKeyDown} className="relative z-10 flex h-full w-full flex-col overflow-clip border-l border-[#d0d7de] bg-[#f6f4f1] shadow-[0_18px_50px_rgba(27,31,36,0.28)] sm:max-w-6xl sm:rounded-md sm:border">
        <DetailHeader
          project={project}
          titleId={titleId}
          editing={editingProject}
          editDisabled={mutationPending || (projectVerificationRequired && !editingProject)}
          closeDisabled={mutationPending}
          onToggleEdit={toggleProjectEdit}
          onClose={closeDetail}
        />

        <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto bg-[#f6f4f1]">
          <div className="grid min-h-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
            <main className="min-w-0 border-r border-[#d8dee4] p-5">
              {refreshError && (
                <DetailRefreshAlert
                  error={refreshError}
                  verificationRequired={projectVerificationRequired}
                  busy={refreshPending || projectVerificationPending}
                  retryDisabled={refreshPending || projectVerificationPending || mutationPending || !!pendingTaskIds?.size}
                  onRetry={() => void onRetry?.()}
                />
              )}
              {/* Mounted once the detail is in, so its statuses read reuses the detail's tasks (MAIR-567). */}
              {project.taskItems && <ProjectWorkflow projectId={project.id} role={canManageWorkflow(workflowRole) && project.permissions?.canEdit === true ? workflowRole : undefined} port={workflowPort} refreshKey={project} loadedTasks={project.taskItems} onSnapshot={receiveWorkflow} onMoveTask={onMoveWorkflowTask} onSaveStatuses={onSaveWorkflowStatuses} onMutation={onMoveWorkflowTask || onSaveWorkflowStatuses ? undefined : () => void onRetry?.()} />}
              {dynamicStatuses && <button type="button" className="mb-4 min-h-11 rounded-md border border-[#d0d7de] bg-white px-3 py-2 text-sm" aria-expanded={showTaskDetails} onClick={() => setShowTaskDetails(value => !value)}>Détails des tâches</button>}
              {project.permissions?.canCreateTask !== false && (
                <TaskFormPanel
                  form={taskForm}
                  editing={!!editingTaskId}
                  saving={taskSaving}
                  error={taskFormError && (!taskFormVerificationError || (!!editingTaskId && !!unverifiedTaskIds?.has(editingTaskId))) ? taskFormError : undefined}
                  disabled={mutationPending}
                  submitDisabled={editingTaskId ? (!!pendingTaskIds?.has(editingTaskId) || !!unverifiedTaskIds?.has(editingTaskId)) : !!(taskCreationState?.pending || taskCreationState?.uncertainTitle)}
                  statusValue={dynamicStatuses ? (dynamicStatuses.some(status => status.id === taskForm.statusId) ? taskForm.statusId : firstStatusOf(categoryOf(taskForm.status))) ?? '' : taskForm.status}
                  statusOptions={dynamicStatuses && !firstStatusOf(categoryOf(taskForm.status)) ? [{ value: '', label: 'Choisir un statut du projet' }, ...taskStatusOptions] : taskStatusOptions}
                  priorityOptions={priorityOptions}
                  memberOptions={memberOptions}
                  labelOptions={labelOptions}
                  onStatusChange={(status) => updateTaskForm(dynamicStatuses ? { statusId: status, status: categoryStatus(status) } : { status: status as Project['status'] })}
                  onChange={updateTaskForm}
                  onCancelEdit={cancelTaskEdit}
                  onSubmit={submitTask}
                >
                  <div ref={taskCreationNoticeRef} tabIndex={-1} className="focus-visible:outline-2 focus-visible:outline-[#cf222e]">
                    <TaskCreationNotice state={taskCreationState} onInspect={onInspectTaskCreation} />
                  </div>
                </TaskFormPanel>
              )}

              {(!dynamicStatuses || showTaskDetails) && <section className="overflow-hidden rounded-md border border-[#d9d5d0] bg-[#fbfaf8]">
                <div className="flex items-center justify-between border-b border-[#dedbd6] bg-[#f1eee9] px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#24292f]">
                    <ListChecks className="h-4 w-4 text-[#57606a]" strokeWidth={1.8} />
                    Tâches
                  </div>
                  <span className="text-xs font-medium text-[#57606a]">
                    {project.tasks.completed}/{project.tasks.total}
                    {project.tasks.archived > 0 && ` · ${archivedTasksLabel(project.tasks.archived)}`}
                  </span>
                </div>

                {pendingTaskIds && [...pendingTaskIds].some(id => !tasks.some(task => task.id === id)) && (
                  <p role="status" className="px-4 py-2 text-xs text-[#57606a]">Actualisation des tâches en cours…</p>
                )}

                {tasks.length > 0 && (
                  <TaskFilters
                    search={taskSearch}
                    status={taskStatusFilter}
                    priority={taskPriorityFilter}
                    due={taskDueFilter}
                    statusOptions={taskStatusOptions}
                    priorityOptions={priorityOptions}
                    onSearchChange={setTaskSearch}
                    onStatusChange={setTaskStatusFilter}
                    onPriorityChange={setTaskPriorityFilter}
                    onDueChange={setTaskDueFilter}
                  />
                )}

                {tasks.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-[#57606a]">Aucune tâche pour ce projet.</div>
                ) : filteredTasks.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-[#57606a]">Aucune tâche ne correspond aux filtres.</div>
                ) : (
                  <div className="divide-y divide-[#d8dee4]">
                    {filteredTasks.map((task) => {
                      const isLinkedTask = highlightTaskId === task.id;
                      const taskPending = pendingTaskIds?.has(task.id) ?? false;
                      const taskMutationBlocked = taskPending || (unverifiedTaskIds?.has(task.id) ?? false);
                      const reopening = task.completed || task.status === 'done';
                      const toggleStatusId = dynamicStatuses ? firstStatusOf(reopening ? 'todo' : 'done') : undefined;

                      return (
                        <TaskRow
                          key={task.id}
                          task={task}
                          linked={isLinkedTask}
                          articleRef={isLinkedTask ? highlightedTaskRef : undefined}
                          pending={taskPending}
                          blocked={taskMutationBlocked}
                          mutationPending={mutationPending}
                          toggleDisabled={(!!dynamicStatuses && !toggleStatusId) || mutationPending || taskMutationBlocked || task.permissions?.canUpdateStatus === false}
                          statusValue={dynamicStatuses ? task.statusId : task.status}
                          statusOptions={taskStatusOptions}
                          writeError={taskWriteErrors?.get(task.id)}
                          deleting={deletingTaskId === task.id}
                          // With project statuses, completing uses the first "Terminé" status, reopening the first "À faire".
                          onToggleDone={() => onUpdateTaskStatus(project.id, task.id, reopening ? 'todo' : 'done', toggleStatusId)}
                          onStatusChange={(value) => onUpdateTaskStatus(project.id, task.id, dynamicStatuses ? categoryStatus(value) : value as ProjectStatus, dynamicStatuses ? value : undefined)}
                          onFollowUp={() => void openTaskCollaboration(task.id)}
                          onEdit={() => editTask(task)}
                          onAskDelete={() => setDeletingTaskId(task.id)}
                        >
                          {deletingTaskId === task.id && (
                            <TaskDeleteConfirm
                              cancelDisabled={mutationPending}
                              confirmDisabled={mutationPending || taskMutationBlocked}
                              onCancel={() => setDeletingTaskId(null)}
                              onConfirm={() => {
                                setDeletingTaskId(null);
                                void onDeleteTask(project.id, task.id, task.title);
                              }}
                            />
                          )}
                          {collaborationTaskId === task.id && (
                            <TaskFollowUp
                              taskTitle={task.title}
                              loading={collaborationLoading}
                              saving={commentSaving}
                              error={collaborationError}
                              collaboration={collaboration}
                              canComment={task.permissions?.canComment !== false}
                              message={commentMessage}
                              onMessageChange={(value) => { if (!commentRequestRef.current) setCommentMessage(value); }}
                              onRefresh={() => {
                                const selection = collaborationSelectionRef.current;
                                if (selection && !commentRequestRef.current && !selection.loading) void loadTaskCollaboration(selection);
                              }}
                              onSubmit={(event) => void submitComment(event, task.id)}
                            />
                          )}
                        </TaskRow>
                      );
                    })}
                  </div>
                )}
              </section>}
            </main>

            <aside className="bg-[#fbfaf8] p-5">
              {editingProject ? (
                <ProjectEditForm
                  form={projectEditForm}
                  saving={projectSaving}
                  error={projectEditError && (!projectEditVerificationError || projectVerificationRequired) ? projectEditError : undefined}
                  disabled={mutationPending}
                  saveDisabled={projectVerificationRequired || projectVerificationPending || project.permissions?.canEdit === false}
                  statusOptions={statusOptions}
                  priorityOptions={priorityOptions}
                  responsibleOptions={responsibleOptions}
                  memberOptions={memberOptions}
                  labelOptions={labelOptions}
                  onChange={updateProjectEditForm}
                  onCancel={cancelProjectEdit}
                  onSubmit={submitProjectEdit}
                />
              ) : (
                <div className="space-y-5">
                  <ProjectSummary project={project} />
                  {project.permissions?.canClose !== false && (
                    <ProjectLifecycle
                      disabled={projectVerificationRequired || projectVerificationPending}
                      onSuspend={() => void onCloseProject(project.id, 'review')}
                      onClose={() => void onCloseProject(project.id, 'done')}
                    />
                  )}
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
