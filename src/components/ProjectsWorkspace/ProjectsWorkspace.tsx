'use client';

import { AccessibleShell } from "@mairie360/lib-components/shell";

import React from 'react';
import { Alert, ConfirmModal, Skeleton, ToastProvider } from '@mairie360/lib-components/primitives';
import { KanbanBoard } from './components/KanbanBoard';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ProjectDetailModal } from './components/ProjectDetailModal';
import { ProjectTemplateManager } from './components/ProjectTemplateManager';
import { ProjectPagination } from './components/ProjectPagination';
import { TaskCreationNotice } from './components/TaskCreationNotice';
import { GridView } from './components/GridView';
import { TableView } from './components/TableView';
import { ProjectsEmptyState } from './components/ProjectsEmptyState';
import { FeedbackToast } from './components/FeedbackToast';
import { ProjectFiltersBar } from './components/ProjectFiltersBar';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { LogoutErrorNotice } from './components/LogoutErrorNotice';
import { PageReadError } from './components/PageReadError';
import { VerificationNotice } from './components/VerificationNotice';
import { WorkspaceLoading } from './components/WorkspaceLoading';
import { navigateToPage } from '../../lib/navigation';
import { returnToLogin } from '../../lib/auth-token';
import type { ProjectsController } from './use-projects-controller';
import type { Project } from '@/types/project';
import { NEW_PROJECT_TASK_VERIFICATION_MESSAGE, NEW_PROJECT_VERIFICATION_MESSAGE, PROJECT_VERIFICATION_MESSAGE } from '../../lib/projectReceiptVerification';

export function ProjectsWorkspace({
  workflowPort,
  moveWorkflowTask,
  saveWorkflowStatuses,
  readCurrentTaskAssignee,
  projectsPage,
  projects,
  closeProjectDetails,
  detailRefreshError,
  detailRefreshPending,
  pendingTaskIds,
  taskWriteErrors,
  unverifiedTaskIds,
  taskCreationStates,
  inspectTaskCreation,
  preserveUncertainTaskDraft,
  unverifiedProjectIds,
  projectVerificationPendingIds,
  projectVerificationErrors,
  newProjectReceiptIssues,
  verifiedCreation,
  newProjectReceiptPendingKeys,
  newProjectReceiptErrors,
  verifyNewProjectReceipt,
  unverifiedDuplicationSourceIds,
  newProjectCatalogueReadPending,
  newProjectCatalogueReadError,
  verifyProjectReceipt,
  retryProjectDetails,
  linkedTaskId,
  viewMode,
  setViewMode,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  dueBeforeFilter,
  setDueBeforeFilter,
  searchTerm,
  setSearchTerm,
  alert,
  logoutError,
  setAlert,
  pageLoading,
  pageError,
  createProjectOpen,
  editingProjectId,
  projectPendingDeletion,
  setProjectPendingDeletion,
  projectForm,
  projectFormError,
  projectFormPending,
  duplicatingProjectIds,
  session,
  memberOptions,
  groupOptions,
  projectGroupsError,
  labelOptions,
  statusFilterOptions,
  priorityFilterOptions,
  projectStatusOptions,
  projectPriorityOptions,
  filteredProjects,
  feedback,
  clearFeedback,
  resetProjectFilters,
  filtersActive,
  retryProjectsPage,
  changeProjectPage,
  openCreateProject,
  openProjectDetails,
  closeCreateProject,
  keepProjectFormCurrent,
  updateProjectForm,
  updateProjectFromForm,
  moveProjectStatus,
  saveProject,
  duplicateProject,
  deleteProject,
  confirmProjectDeletion,
  selectedProjects,
  changeProjectSelection,
  clearProjectSelection,
  bulkDeletionOpen,
  bulkDeletionPending,
  requestBulkProjectDeletion,
  cancelBulkProjectDeletion,
  confirmBulkProjectDeletion,
  addProjectTask,
  updateProjectTask,
  changeProjectTaskStatus,
  deleteProjectTask,
  closeProject,
  selectedProject,
  selectedProjectTasks,
  canCreateProject,
  pageTitle,
  pageSubtitle,
  frontHrefs,
  logout,
}: ProjectsController) {
  const creationReceipt = newProjectReceiptIssues.get('create');
  const verifiesCreationDetail = Boolean(creationReceipt?.verificationId);
  return (
    <ToastProvider regionLabel="Notifications des projets">
      <FeedbackToast feedback={feedback} onShown={clearFeedback} />
      <ConfirmModal
        open={Boolean(projectPendingDeletion)}
        title="Supprimer le projet"
        message={projectPendingDeletion && <>Le projet <strong>{projectPendingDeletion.title}</strong> et ses tâches seront supprimés définitivement.</>}
        confirmLabel="Supprimer"
        destructive
        initialFocus="cancel"
        onCancel={() => setProjectPendingDeletion(null)}
        onConfirm={() => void confirmProjectDeletion()}
      />

      {/* MAIR-833 (Figma F1 1.4): bulk deletion of the table selection. */}
      <ConfirmModal
        open={bulkDeletionOpen}
        title="Supprimer les projets"
        message={bulkDeletionMessage(selectedProjects)}
        confirmLabel="Confirmer la suppression"
        destructive
        busy={bulkDeletionPending}
        initialFocus="cancel"
        onCancel={cancelBulkProjectDeletion}
        onConfirm={() => void confirmBulkProjectDeletion()}
      />

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          workflowPort={workflowPort}
          onMoveWorkflowTask={moveWorkflowTask}
          onSaveWorkflowStatuses={saveWorkflowStatuses}
          workflowRole={projectsPage?.access.role}
          readCurrentTaskAssignee={readCurrentTaskAssignee}
          tasks={selectedProjectTasks}
          highlightTaskId={linkedTaskId}
          memberOptions={memberOptions}
          labelOptions={labelOptions}
          groupOptions={groupOptions}
          groupsError={projectGroupsError}
          statusOptions={projectStatusOptions}
          priorityOptions={projectPriorityOptions}
          onClose={closeProjectDetails}
          refreshError={detailRefreshError}
          refreshPending={detailRefreshPending}
          projectVerificationRequired={unverifiedProjectIds.has(selectedProject.id)}
          projectVerificationPending={projectVerificationPendingIds.has(selectedProject.id)}
          pendingTaskIds={pendingTaskIds}
          taskWriteErrors={taskWriteErrors}
          unverifiedTaskIds={unverifiedTaskIds}
          taskCreationState={taskCreationStates.get(selectedProject.id)}
          onInspectTaskCreation={() => inspectTaskCreation(selectedProject.id)}
          onPreserveTaskDraft={patch => preserveUncertainTaskDraft(selectedProject.id, patch)}
          onRetry={retryProjectDetails}
          onUpdateProject={updateProjectFromForm}
          onAddTask={addProjectTask}
          onUpdateTask={updateProjectTask}
          onUpdateTaskStatus={changeProjectTaskStatus}
          onDeleteTask={deleteProjectTask}
          onCloseProject={closeProject}
        />
      )}

      {createProjectOpen && (
        <CreateProjectModal
          key={editingProjectId ?? 'create'}
          mode={editingProjectId ? 'edit' : 'create'}
          workflowPort={workflowPort}
          form={projectForm}
          error={projectFormError}
          pending={projectFormPending}
          verificationRequired={editingProjectId ? unverifiedProjectIds.has(editingProjectId) : newProjectReceiptIssues.has('create')}
          verificationPending={editingProjectId ? projectVerificationPendingIds.has(editingProjectId) : verifiesCreationDetail ? newProjectReceiptPendingKeys.has('create') : newProjectCatalogueReadPending}
          verificationError={editingProjectId ? projectVerificationErrors.get(editingProjectId) : verifiesCreationDetail ? newProjectReceiptErrors.get('create') : newProjectCatalogueReadError}
          verificationMessage={editingProjectId ? PROJECT_VERIFICATION_MESSAGE : verifiesCreationDetail ? NEW_PROJECT_TASK_VERIFICATION_MESSAGE : NEW_PROJECT_VERIFICATION_MESSAGE}
          verificationLabel={editingProjectId || verifiesCreationDetail ? 'Vérifier le projet' : 'Actualiser le catalogue'}
          verificationPendingLabel={editingProjectId || verifiesCreationDetail ? 'Vérification du projet…' : 'Actualisation du catalogue…'}
          confirmedCreationTitle={!editingProjectId ? verifiedCreation?.title : undefined}
          canSave={!editingProjectId || projects.find(project => project.id === editingProjectId)?.permissions?.canEdit !== false}
          onVerify={() => editingProjectId ? verifyProjectReceipt(editingProjectId) : verifyNewProjectReceipt('create')}
          memberOptions={memberOptions}
          labelOptions={labelOptions}
          groupOptions={groupOptions}
          groupsError={projectGroupsError}
          statusOptions={projectStatusOptions}
          priorityOptions={projectPriorityOptions}
          onChange={updateProjectForm}
          onClose={closeCreateProject}
          onInteract={keepProjectFormCurrent}
          onSubmit={saveProject}
        />
      )}

      <AccessibleShell
        activeItem="projects"
        user={session.user}
        onLogout={() => void logout()}
        hrefs={{ ...frontHrefs, projects: frontHrefs.projects ?? '/' }}
        className="projects-shell"
      >
            {!projectsPage && !pageError && <WorkspaceLoading />}
            <div hidden={!projectsPage && !pageError} className="mx-auto w-full max-w-[1660px] px-6 py-10 lg:px-14 lg:py-14">
              {logoutError && <LogoutErrorNotice message={logoutError} onBackToLogin={returnToLogin} />}
              {[...taskCreationStates].filter(([, state]) => state.uncertainTitle).map(([projectId, state]) => (
                <TaskCreationNotice key={projectId} state={state} onInspect={() => inspectTaskCreation(projectId)} />
              ))}
              {[...newProjectReceiptIssues].map(([key, issue]) => (
                <VerificationNotice
                  key={key}
                  title={`${issue.kind === 'create' ? 'Création' : 'Duplication'} non vérifiée : ${issue.title}`}
                  message={issue.verificationId ? NEW_PROJECT_TASK_VERIFICATION_MESSAGE : NEW_PROJECT_VERIFICATION_MESSAGE}
                  error={issue.verificationId ? newProjectReceiptErrors.get(key) : newProjectCatalogueReadError}
                  pending={issue.verificationId ? newProjectReceiptPendingKeys.has(key) : newProjectCatalogueReadPending}
                  label={issue.verificationId ? 'Vérifier le projet' : 'Actualiser le catalogue'}
                  pendingLabel={issue.verificationId ? 'Vérification du projet…' : 'Actualisation du catalogue…'}
                  onVerify={() => void verifyNewProjectReceipt(key)}
                />
              ))}
              {[...unverifiedProjectIds].map(projectId => {
                const title = projects.find(project => project.id === projectId)?.title ?? projectId;
                return <VerificationNotice
                  key={projectId}
                  title={title}
                  message={PROJECT_VERIFICATION_MESSAGE}
                  error={projectVerificationErrors.get(projectId)}
                  pending={projectVerificationPendingIds.has(projectId)}
                  label={`Vérifier le projet ${title}`}
                  pendingLabel="Vérification du projet…"
                  onVerify={() => void verifyProjectReceipt(projectId)}
                />;
              })}
              {alert && (
                <div className="mb-5">
                  {/* MAIR-608: in-page feedback is the lib Alert (a standalone Toast is not announced). */}
                  <Alert
                    tone={alert.type === 'error' ? 'danger' : alert.type}
                    title={alert.message}
                    onDismiss={() => setAlert(null)}
                  />
                </div>
              )}

              <WorkspaceHeader
                title={pageTitle}
                subtitle={pageSubtitle}
                scope={projectsPage?.access?.scope}
                onCreate={canCreateProject ? () => openCreateProject() : undefined}
                onSettings={() => navigateToPage('settings')}
              />

              <ProjectTemplateManager role={projectsPage?.access.role} port={workflowPort} />

              <ProjectFiltersBar
                search={searchTerm}
                status={statusFilter}
                priority={priorityFilter}
                dueBefore={dueBeforeFilter}
                statusOptions={statusFilterOptions}
                priorityOptions={priorityFilterOptions}
                viewMode={viewMode}
                views={projectsPage?.page.views ?? []}
                onSearchChange={setSearchTerm}
                onStatusChange={setStatusFilter}
                onPriorityChange={setPriorityFilter}
                onDueBeforeChange={setDueBeforeFilter}
                onViewModeChange={setViewMode}
              />

              <section className="pt-8">
                {duplicatingProjectIds.length > 0 && (
                  <p role="status" className="mb-4 text-sm font-medium text-[#57606a]">
                    Duplication du projet en cours…
                  </p>
                )}
                {pageLoading && projects.length === 0 && (
                  <Skeleton label="Chargement des projets..." className="min-h-32" />
                )}

                {pageError && <PageReadError error={pageError} stale={projects.length > 0} loading={pageLoading} onRetry={() => void retryProjectsPage()} />}

                {(!pageLoading || projects.length > 0) && (!pageError || projects.length > 0) && viewMode === 'kanban' && filtersActive && filteredProjects.length === 0 && (
                  <ProjectsEmptyState onReset={resetProjectFilters} />
                )}

                {(!pageLoading || projects.length > 0) && (!pageError || projects.length > 0) && !(filtersActive && filteredProjects.length === 0) && viewMode === 'kanban' && (
                  <KanbanBoard
                    projects={filteredProjects}
                    unverifiedDuplicationSourceIds={unverifiedDuplicationSourceIds}
                    duplicatingProjectIds={duplicatingProjectIds}
                    columns={projectsPage?.kanban.columns ?? []}
                    onProjectOpen={openProjectDetails}
                    onProjectDuplicate={duplicateProject}
                    onProjectDelete={deleteProject}
                    onAddProject={canCreateProject ? openCreateProject : undefined}
                    onMoveProject={projectsPage?.access?.canManageProjects ? moveProjectStatus : undefined}
                  />
                )}

                {(!pageLoading || projects.length > 0) && (!pageError || projects.length > 0) && viewMode === 'grid' && (
                  <GridView
                    projects={filteredProjects}
                    unverifiedDuplicationSourceIds={unverifiedDuplicationSourceIds}
                    duplicatingProjectIds={duplicatingProjectIds}
                    onProjectOpen={openProjectDetails}
                    onProjectDuplicate={duplicateProject}
                    onProjectDelete={deleteProject}
                    onProjectStatusChange={projectsPage?.access?.canManageProjects ? moveProjectStatus : undefined}
                    onResetFilters={filtersActive ? resetProjectFilters : undefined}
                  />
                )}

                {(!pageLoading || projects.length > 0) && (!pageError || projects.length > 0) && viewMode === 'table' && (
                  <TableView
                    projects={filteredProjects}
                    unverifiedDuplicationSourceIds={unverifiedDuplicationSourceIds}
                    duplicatingProjectIds={duplicatingProjectIds}
                    onProjectOpen={openProjectDetails}
                    onProjectDuplicate={duplicateProject}
                    onProjectDelete={deleteProject}
                    onProjectStatusChange={projectsPage?.access?.canManageProjects ? moveProjectStatus : undefined}
                    onResetFilters={filtersActive ? resetProjectFilters : undefined}
                    selectedProjectIds={new Set(selectedProjects.map((project) => project.id))}
                    onSelectionChange={changeProjectSelection}
                    onClearSelection={clearProjectSelection}
                    onDeleteSelection={requestBulkProjectDeletion}
                  />
                )}
                {projectsPage && (
                  <ProjectPagination pagination={projectsPage.pagination} pending={pageLoading} stale={Boolean(pageError)} onChange={changeProjectPage} />
                )}
              </section>
            </div>
      </AccessibleShell>
    </ToastProvider>
  );
}

/** « Les 2 projets sélectionnés et leurs 12 tâches seront supprimés. Cette action est irréversible. » */
export function bulkDeletionMessage(projects: Project[]) {
  const tasks = projects.reduce((total, project) => total + (project.tasks?.total ?? 0), 0);
  const taskText = `${tasks} tâche${tasks > 1 ? 's' : ''}`;
  const subject = projects.length > 1
    ? `Les ${projects.length} projets sélectionnés et leurs ${taskText} seront supprimés.`
    : `Le projet sélectionné et ses ${taskText} seront supprimés.`;
  return `${subject} Cette action est irréversible.`;
}
