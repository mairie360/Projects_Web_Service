'use client';

import React from 'react';
import { Modal, PendingFeatureNotice, Tabs, tabsIds, type TabItem } from '@mairie360/lib-components/primitives';
import { Activity, CalendarRange, FileText, LayoutGrid, ListChecks, Users } from 'lucide-react';
import { projectTabFromSearch, writeProjectLocation, type ProjectTab } from '@/lib/projectDeepLink';
import { getProjectNumber } from '../../project-card-meta';
import { canManageWorkflow, type ProjectWorkflowPort, type ProjectWorkflowSnapshot } from '@/lib/projectWorkflow';
import { projectToFormState, type FilterOption, type ProjectFormState, type TaskFormState } from '@/lib/projectPageState';
import type { Project, ProjectStatus, ProjectTask, ProjectTaskDraft } from '@/types/project';
import { TaskCreationNotice, type TaskCreationState } from '../TaskCreationNotice';
import { DetailRefreshAlert } from './components/DetailRefreshAlert';
import { ProjectEditForm } from './components/ProjectEditForm';
import { ProjectMetrics } from './components/ProjectMetrics';
import { ProjectOverview } from './components/ProjectOverview';
import { ProjectPageHeader } from './components/ProjectPageHeader';
import { ProjectTasksTab } from './components/ProjectTasksTab';
import { ProjectWorkflow } from './components/ProjectWorkflow';
import { useDetailTaskForm, type TaskColumnStatus } from './use-detail-task-form';
import { useLinkedTaskScroll } from './use-linked-task-scroll';
import { categoryOf, projectStatusHelpers } from './status-helpers';
import { useProjectEdit, type MutationLock } from './use-project-edit';
import { useTaskCollaboration } from './use-task-collaboration';
import { useTaskFilters } from './use-task-filters';

export function ProjectPage({
  project,
  workflowPort,
  onSaveWorkflowStatuses,
  workflowRole,
  defaultTaskAssigneeId,
  readCurrentTaskAssignee,
  tasks,
  highlightTaskId,
  memberOptions,
  labelOptions,
  groupOptions,
  groupsError,
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
  onChangeStatus,
  onDuplicate,
  duplicationPending = false,
  duplicationVerificationRequired = false,
  onDelete,
  initialTab,
}: {
  project: Project;
  workflowPort?: ProjectWorkflowPort;
  /** Controller-owned status settings write (MAIR-570); without it the panel writes through the port. */
  onSaveWorkflowStatuses?: ProjectWorkflowPort['saveProjectStatuses'];
  workflowRole?: string;
  defaultTaskAssigneeId?: string | null;
  readCurrentTaskAssignee?: (signal: AbortSignal) => Promise<string | null>;
  tasks: ProjectTask[];
  highlightTaskId?: string | null;
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  groupOptions?: FilterOption[];
  groupsError?: string;
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
  /** Resolves `true` once the BFF confirmed the status (MAIR-859: the board rolls back otherwise). */
  onUpdateTaskStatus: (projectId: string, taskId: string, status: ProjectStatus, statusId?: string) => void | boolean | Promise<void | boolean>;
  onDeleteTask: (projectId: string, taskId: string, taskTitle: string) => Promise<unknown>;
  onCloseProject: (projectId: string, status: 'done' | 'review') => Promise<void>;
  /** MAIR-846: the status pill menu, the « … » actions (Dupliquer, Supprimer + confirmation by the workspace). */
  onChangeStatus?: (project: Project, status: Project['status']) => void | Promise<void>;
  onDuplicate?: (project: Project) => void | Promise<void>;
  duplicationPending?: boolean;
  duplicationVerificationRequired?: boolean;
  onDelete?: (project: Project) => void | Promise<void>;
  /** Tab shown first; by default the URL's (`?tab=`), « Tâches » for a linked task, else « Vue d’ensemble ». */
  initialTab?: ProjectTab;
}) {
  const [workflow, setWorkflow] = React.useState<ProjectWorkflowSnapshot | null>(null);
  const receiveWorkflow = React.useCallback((snapshot: ProjectWorkflowSnapshot) => setWorkflow(snapshot), []);
  const dynamicStatuses = workflow?.projectId === project.id ? workflow.statuses : undefined;
  const taskStatusOptions = dynamicStatuses?.map(status => ({ value: status.id, label: status.name })) ?? statusOptions;
  const lockRef: MutationLock = React.useRef({ project: false, task: false });
  const closeDetail = () => {
    if (!lockRef.current.project && !lockRef.current.task) onClose();
  };
  // MAIR-846: a page, not a dialog — the title takes the focus on open, the opener gets it back on leave.
  const titleRef = React.useRef<HTMLHeadingElement | null>(null);
  React.useLayoutEffect(() => {
    const opener = typeof HTMLElement !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null;
    titleRef.current?.focus({ preventScroll: true });
    return () => {
      // The list is shown again in the same commit: give the focus back once it is visible.
      queueMicrotask(() => {
        if (opener?.isConnected && (document.activeElement === document.body || !document.activeElement)) opener.focus();
      });
    };
  }, []);
  const projectEdit = useProjectEdit({ project, lockRef, dialogRef: titleRef, verificationBlocked: projectVerificationRequired || projectVerificationPending, groupCount: groupOptions?.length ?? 0, onUpdateProject });
  // MAIR-1136 (C13): the saved values the edit compares with (« Modifié », « Enregistrer (n) »).
  const savedForm = React.useMemo(() => projectToFormState(project), [project]);
  const [tab, setTab] = React.useState<ProjectTab>(() => initialTab ?? (highlightTaskId ? 'tasks' : projectTabFromSearch(typeof window === 'undefined' ? '' : window.location?.search ?? '')));
  const showTab = (next: ProjectTab) => {
    setTab(next);
    writeProjectLocation(project.id, next, 'replace');
  };
  const tabsId = React.useId();
  // MAIR-1137 (C15): the task whose page is shown in « Tâches » (from the board, the list or « Prochaines tâches »).
  const [viewedTaskId, setViewedTaskId] = React.useState<string | null>(null);
  const viewTask = (taskId: string) => {
    showTab('tasks');
    setViewedTaskId(taskId);
  };
  // The ref stays out of the `taskForm` object so the compiler lint does not read it as a ref access during render.
  const { noticeRef: taskNoticeRef, ...taskForm } = useDetailTaskForm({ project, lockRef, memberOptions, defaultTaskAssigneeId, readCurrentTaskAssignee, taskCreationState, onPreserveTaskDraft, pendingTaskIds, unverifiedTaskIds, dynamicStatuses, onAddTask, onUpdateTask });
  const filters = useTaskFilters({ tasks });
  const collaboration = useTaskCollaboration({ projectId: project.id, tasks });
  const { contentRef, highlightedTaskRef } = useLinkedTaskScroll(highlightTaskId, filters.filteredTasks);
  const taskProjectIdRef = React.useRef(project.id);
  const officialProjectRef = React.useRef<Project | null>(null);
  const titleId = React.useId();
  const responsibleOptions = [{ label: 'Choisir un responsable', value: '' }, ...memberOptions];
  // The current group stays selectable even when the caller cannot link projects to it any more.
  const editGroupOptions = project.group && !(groupOptions ?? []).some((option) => option.value === project.group?.id)
    ? [{ value: project.group.id, label: project.group.name }, ...(groupOptions ?? [])]
    : groupOptions;
  const { firstStatusOf } = projectStatusHelpers(dynamicStatuses);
  // MAIR-859: a board column is the first project status of its category; a category without one takes no task.
  const unavailableColumns = new Set<TaskColumnStatus>(dynamicStatuses ? (['todo', 'in-progress', 'done'] as const).filter((status) => !firstStatusOf(categoryOf(status))) : []);
  const moveTask = async (task: ProjectTask, status: TaskColumnStatus) =>
    (await onUpdateTaskStatus(project.id, task.id, status, dynamicStatuses ? firstStatusOf(categoryOf(status)) : undefined)) === true;
  const team = new Set([project.responsible, ...project.assignees].filter((person) => person.name).map((person) => person.id ?? person.name));
  const tabItems: TabItem<ProjectTab>[] = [
    { key: 'overview', label: 'Vue d’ensemble', icon: LayoutGrid },
    { key: 'tasks', label: 'Tâches', icon: ListChecks, count: tasks.length },
    { key: 'planning', label: 'Planning', icon: CalendarRange },
    { key: 'team', label: 'Équipe', icon: Users, count: team.size },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'activity', label: 'Activité', icon: Activity },
  ];
  const panelProps = (key: ProjectTab) => ({ id: tabsIds(tabsId, key).panel, role: 'tabpanel', 'aria-labelledby': tabsIds(tabsId, key).tab, tabIndex: 0, hidden: tab !== key, className: 'focus-visible:outline-none' });
  const pendingFeature = (feature: string) => <PendingFeatureNotice feature={feature} description={`L’onglet « ${feature} » arrive avec son propre ticket.`} />;
  const mutationPending = projectEdit.saving || taskForm.saving;

  React.useEffect(() => {
    // Retained input changes are not a new official project response: do not
    // reset task searches/filters or unrelated editors on each keystroke.
    if (officialProjectRef.current === project) return;
    officialProjectRef.current = project;
    const projectChanged = taskProjectIdRef.current !== project.id;
    projectEdit.syncProject(project);
    if (projectChanged) {
      taskProjectIdRef.current = project.id;
      taskForm.resetForProject();
      collaboration.reset();
      setViewedTaskId(null);
    }
    if (projectChanged) filters.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the hooks' reset callbacks read the latest props by closure
  }, [project, taskCreationState?.draft]);

  return (
    <section aria-labelledby={titleId} className="space-y-8">
      <ProjectPageHeader
        project={project}
        titleId={titleId}
        titleRef={titleRef}
        backDisabled={mutationPending}
        onBack={closeDetail}
        onChangeStatus={onChangeStatus && project.permissions?.canEdit === true ? (status) => void onChangeStatus(project, status) : undefined}
        statusDisabled={mutationPending || projectVerificationRequired || projectVerificationPending}
        onEdit={project.permissions?.canEdit !== false ? projectEdit.toggle : undefined}
        editDisabled={mutationPending || projectVerificationRequired}
        onNewTask={project.permissions?.canCreateTask !== false ? () => { showTab('tasks'); taskForm.openCreate(); } : undefined}
        onDuplicate={onDuplicate && project.permissions?.canDuplicate !== false ? () => void onDuplicate(project) : undefined}
        duplicateDisabled={duplicationPending || duplicationVerificationRequired}
        duplicateLabel={duplicationVerificationRequired ? 'Copie à vérifier' : 'Dupliquer'}
        onDelete={onDelete && project.permissions?.canDelete !== false ? () => void onDelete(project) : undefined}
      />
      {refreshError && (
        <DetailRefreshAlert
          error={refreshError}
          verificationRequired={projectVerificationRequired}
          busy={refreshPending || projectVerificationPending}
          retryDisabled={refreshPending || projectVerificationPending || mutationPending || !!pendingTaskIds?.size}
          onRetry={() => void onRetry?.()}
        />
      )}

      <ProjectMetrics project={project} tasks={tasks} />

      <Tabs label="Sections du projet" id={tabsId} items={tabItems} value={tab} onChange={showTab} hostPanel />

      <div {...panelProps('overview')}>
        <ProjectOverview
          project={project}
          tasks={tasks}
          pendingTaskIds={pendingTaskIds}
          disabled={mutationPending}
          lifecycleDisabled={projectVerificationRequired || projectVerificationPending}
          onCompleteTask={(task) => void onUpdateTaskStatus(project.id, task.id, 'done', firstStatusOf('done'))}
          onShowTab={showTab}
          onOpenTask={(task) => viewTask(task.id)}
          onSuspend={() => void onCloseProject(project.id, 'review')}
          onCloseProject={() => void onCloseProject(project.id, 'done')}
        />
      </div>

      {/* The tasks stay mounted on every tab: drafts, pending writes and comments survive a tab change. */}
      <div {...panelProps('tasks')} ref={contentRef}>
        <ProjectTasksTab
          key={project.id}
          project={project}
          tasks={tasks}
          filters={filters}
          taskForm={taskForm}
          collaboration={collaboration}
          statusOptions={taskStatusOptions}
          priorityOptions={priorityOptions}
          memberOptions={memberOptions}
          labelOptions={labelOptions}
          unavailableColumns={unavailableColumns}
          pendingTaskIds={pendingTaskIds}
          unverifiedTaskIds={unverifiedTaskIds}
          taskWriteErrors={taskWriteErrors}
          mutationPending={mutationPending}
          highlightTaskId={highlightTaskId}
          highlightedTaskRef={highlightedTaskRef}
          viewedTaskId={viewedTaskId}
          onViewTask={setViewedTaskId}
          onMoveTask={moveTask}
          onDeleteTask={onDeleteTask}
          creationNotice={(
            <div ref={taskNoticeRef} tabIndex={-1} className="mt-4 focus-visible:outline-2 focus-visible:outline-[#cf222e]">
              <TaskCreationNotice state={taskCreationState} onInspect={onInspectTaskCreation} />
            </div>
          )}
        />
        {/* Mounted once the detail is in, so its statuses read reuses the detail's tasks (MAIR-567). It reads the
            project's own statuses (the sheet's « État ») and lets the managers set them up. */}
        {project.taskItems && <ProjectWorkflow projectId={project.id} role={canManageWorkflow(workflowRole) && project.permissions?.canEdit === true ? workflowRole : undefined} port={workflowPort} refreshKey={project} loadedTasks={project.taskItems} onSnapshot={receiveWorkflow} onSaveStatuses={onSaveWorkflowStatuses} onMutation={onSaveWorkflowStatuses ? undefined : () => void onRetry?.()} />}
      </div>

      <div {...panelProps('planning')}>{pendingFeature('Planning')}</div>
      <div {...panelProps('team')}>{pendingFeature('Équipe')}</div>
      <div {...panelProps('documents')}>{pendingFeature('Documents')}</div>
      <div {...panelProps('activity')}>{pendingFeature('Activité')}</div>

      {/* MAIR-846 (C7, Figma F5 5.6): « Modifier » opens the project fields only, in a size m modal. */}
      <Modal open={projectEdit.editing} title={`Modifier le projet · ${getProjectNumber(project)}`} size="m" closeOnBackdrop={!mutationPending} onClose={projectEdit.cancel}>
        <ProjectEditForm
          form={projectEdit.form}
          saving={projectEdit.saving}
          error={projectEdit.error && (!projectEdit.verificationError || projectVerificationRequired) ? projectEdit.error : undefined}
          fieldErrors={projectEdit.fieldErrors}
          disabled={mutationPending}
          saveDisabled={projectVerificationRequired || projectVerificationPending || project.permissions?.canEdit === false}
          statusOptions={statusOptions}
          priorityOptions={priorityOptions}
          responsibleOptions={responsibleOptions}
          memberOptions={memberOptions}
          labelOptions={labelOptions}
          groupOptions={editGroupOptions}
          groupsError={groupsError}
          onChange={projectEdit.update}
          onCancel={projectEdit.cancel}
          onSubmit={projectEdit.submit}
          initial={savedForm}
          onDelete={onDelete && project.permissions?.canDelete !== false ? () => { projectEdit.cancel(); void onDelete(project); } : undefined}
        />
      </Modal>
    </section>
  );
}
