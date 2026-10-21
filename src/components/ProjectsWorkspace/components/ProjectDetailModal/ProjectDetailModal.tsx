'use client';

import React from 'react';
import { canManageWorkflow, type ProjectWorkflowPort, type ProjectWorkflowSnapshot } from '@/lib/projectWorkflow';
import type { FilterOption, ProjectFormState, TaskFormState } from '@/lib/projectPageState';
import type { Project, ProjectStatus, ProjectTask, ProjectTaskDraft } from '@/types/project';
import { TaskCreationNotice, type TaskCreationState } from '../TaskCreationNotice';
import { DetailHeader } from './components/DetailHeader';
import { DetailRefreshAlert } from './components/DetailRefreshAlert';
import { DetailTaskList } from './components/DetailTaskList';
import { ProjectEditForm } from './components/ProjectEditForm';
import { ProjectLifecycle } from './components/ProjectLifecycle';
import { ProjectSummary } from './components/ProjectSummary';
import { ProjectWorkflow } from './components/ProjectWorkflow';
import { TaskFormPanel } from './components/TaskFormPanel';
import { useDetailTaskForm } from './use-detail-task-form';
import { useDialogFocus } from './use-dialog-focus';
import { useLinkedTaskScroll } from './use-linked-task-scroll';
import { useProjectEdit, type MutationLock } from './use-project-edit';
import { useTaskCollaboration } from './use-task-collaboration';
import { useTaskFilters } from './use-task-filters';

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
  const lockRef: MutationLock = React.useRef({ project: false, task: false });
  const closeDetail = () => {
    if (!lockRef.current.project && !lockRef.current.task) onClose();
  };
  const { overlayRef, dialogRef, handleDialogKeyDown } = useDialogFocus(closeDetail);
  const projectEdit = useProjectEdit({ project, lockRef, dialogRef, verificationBlocked: projectVerificationRequired || projectVerificationPending, onUpdateProject });
  // The ref stays out of the `taskForm` object so the compiler lint does not read it as a ref access during render.
  const { noticeRef: taskNoticeRef, ...taskForm } = useDetailTaskForm({ project, lockRef, memberOptions, defaultTaskAssigneeId, readCurrentTaskAssignee, taskCreationState, onPreserveTaskDraft, pendingTaskIds, unverifiedTaskIds, dynamicStatuses, onAddTask, onUpdateTask });
  const filters = useTaskFilters({ tasks, dynamicStatuses });
  const collaboration = useTaskCollaboration({ projectId: project.id, tasks });
  const { contentRef, highlightedTaskRef } = useLinkedTaskScroll(highlightTaskId, filters.filteredTasks);
  const [deletingTaskId, setDeletingTaskId] = React.useState<string | null>(null);
  const taskProjectIdRef = React.useRef(project.id);
  const officialProjectRef = React.useRef<Project | null>(null);
  const titleId = React.useId();
  const responsibleOptions = [{ label: 'Sélectionner un assigné', value: '' }, ...memberOptions];
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
    }
    filters.reset();
    setDeletingTaskId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the hooks' reset callbacks read the latest props by closure
  }, [project, taskCreationState?.draft]);

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[75] flex items-stretch justify-end bg-black/45 p-0 sm:p-4">
      <button type="button" aria-hidden="true" tabIndex={-1} disabled={mutationPending} className="absolute inset-0" onClick={closeDetail} />

      {/* Clip rather than hide overflow: native field focus must scroll only the body, never this header-bearing container. */}
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={handleDialogKeyDown} className="relative z-10 flex h-full w-full flex-col overflow-clip border-l border-[#d0d7de] bg-[#f6f4f1] shadow-[0_18px_50px_rgba(27,31,36,0.28)] sm:max-w-6xl sm:rounded-md sm:border">
        <DetailHeader
          project={project}
          titleId={titleId}
          editing={projectEdit.editing}
          editDisabled={mutationPending || (projectVerificationRequired && !projectEdit.editing)}
          closeDisabled={mutationPending}
          onToggleEdit={projectEdit.toggle}
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
                  form={taskForm.form}
                  editing={!!taskForm.editingTaskId}
                  saving={taskForm.saving}
                  error={taskForm.error}
                  disabled={mutationPending}
                  submitDisabled={taskForm.submitDisabled}
                  statusValue={taskForm.statusValue}
                  statusOptions={taskForm.missingDefaultStatus ? [{ value: '', label: 'Choisir un statut du projet' }, ...taskStatusOptions] : taskStatusOptions}
                  priorityOptions={priorityOptions}
                  memberOptions={memberOptions}
                  labelOptions={labelOptions}
                  onStatusChange={taskForm.onStatusChange}
                  onChange={taskForm.update}
                  onCancelEdit={taskForm.cancel}
                  onSubmit={taskForm.submit}
                >
                  <div ref={taskNoticeRef} tabIndex={-1} className="focus-visible:outline-2 focus-visible:outline-[#cf222e]">
                    <TaskCreationNotice state={taskCreationState} onInspect={onInspectTaskCreation} />
                  </div>
                </TaskFormPanel>
              )}

              {(!dynamicStatuses || showTaskDetails) && (
                <DetailTaskList
                  project={project}
                  tasks={tasks}
                  filters={filters}
                  collaboration={collaboration}
                  taskStatusOptions={taskStatusOptions}
                  priorityOptions={priorityOptions}
                  dynamicStatuses={dynamicStatuses}
                  pendingTaskIds={pendingTaskIds}
                  unverifiedTaskIds={unverifiedTaskIds}
                  taskWriteErrors={taskWriteErrors}
                  mutationPending={mutationPending}
                  highlightTaskId={highlightTaskId}
                  highlightedTaskRef={highlightedTaskRef}
                  deletingTaskId={deletingTaskId}
                  onDeletingChange={setDeletingTaskId}
                  onUpdateTaskStatus={onUpdateTaskStatus}
                  onDeleteTask={onDeleteTask}
                  onEditTask={taskForm.edit}
                />
              )}
            </main>

            <aside className="bg-[#fbfaf8] p-5">
              {projectEdit.editing ? (
                <ProjectEditForm
                  form={projectEdit.form}
                  saving={projectEdit.saving}
                  error={projectEdit.error && (!projectEdit.verificationError || projectVerificationRequired) ? projectEdit.error : undefined}
                  disabled={mutationPending}
                  saveDisabled={projectVerificationRequired || projectVerificationPending || project.permissions?.canEdit === false}
                  statusOptions={statusOptions}
                  priorityOptions={priorityOptions}
                  responsibleOptions={responsibleOptions}
                  memberOptions={memberOptions}
                  labelOptions={labelOptions}
                  onChange={projectEdit.update}
                  onCancel={projectEdit.cancel}
                  onSubmit={projectEdit.submit}
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
