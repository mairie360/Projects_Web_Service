'use client';

import { AccessibleShell } from "@mairie360/lib-components/shell";

import React from 'react';
import { Alert, Skeleton } from '@mairie360/lib-components/primitives';
import { KanbanBoard } from '../Kanban';
import { CreateProjectModal } from './CreateProjectModal';
import { ProjectDetailModal } from './ProjectDetailModal';
import { ProjectTemplateManager } from './ProjectWorkflow';
import { ProjectPagination } from './ProjectPagination';
import { TaskCreationNotice } from './TaskCreationNotice';
import { GridView, TableView } from './ProjectViews';
import { ProjectFiltersBar } from './workspace/ProjectFiltersBar';
import { WorkspaceHeader } from './workspace/WorkspaceHeader';
import { LogoutErrorNotice, PageReadError, VerificationNotice, WorkspaceLoading } from './workspace/WorkspaceNotices';
import { navigateToPage } from '../../lib/navigation';
import { returnToLogin } from '../../lib/auth-token';
import type { ProjectsController } from './useProjectsController';
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
  openFilter,
  setOpenFilter,
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
  labelOptions,
  statusFilterOptions,
  priorityFilterOptions,
  projectStatusOptions,
  projectPriorityOptions,
  filteredProjects,
  retryProjectsPage,
  changeProjectPage,
  openCreateProject,
  openProjectDetails,
  openEditProject,
  closeCreateProject,
  keepProjectFormCurrent,
  updateProjectForm,
  updateProjectFromForm,
  moveProjectStatus,
  saveProject,
  duplicateProject,
  deleteProject,
  confirmProjectDeletion,
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
    <>
      {projectPendingDeletion && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-project-title">
          <div className="w-full max-w-md overflow-hidden rounded-md border border-[#d0d7de] bg-[#fbfaf8] shadow-[0_18px_50px_rgba(27,31,36,0.28)]">
            <div className="border-b border-[#dedbd6] bg-[#2b2b2b] px-5 py-4">
              <h2 id="delete-project-title" className="text-base font-semibold text-white">Supprimer le projet</h2>
            </div>
            <div className="p-5">
              <p className="text-sm leading-relaxed text-[#57606a]">
                Le projet <strong className="text-[#24292f]">{projectPendingDeletion.title}</strong> et ses tâches seront supprimés définitivement.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" className="h-9 rounded-md border border-[#d0d7de] bg-white px-4 text-sm font-semibold text-[#24292f] hover:bg-[#f1eee9]" onClick={() => setProjectPendingDeletion(null)}>Annuler</button>
                <button type="button" className="h-9 rounded-md bg-[#cf222e] px-4 text-sm font-semibold text-white hover:bg-[#a40e26]" onClick={() => void confirmProjectDeletion()}>Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                openFilter={openFilter}
                viewMode={viewMode}
                views={projectsPage?.page.views ?? []}
                onSearchChange={setSearchTerm}
                onStatusChange={setStatusFilter}
                onPriorityChange={setPriorityFilter}
                onDueBeforeChange={setDueBeforeFilter}
                onOpenFilterChange={setOpenFilter}
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

                {(!pageLoading || projects.length > 0) && (!pageError || projects.length > 0) && viewMode === 'kanban' && (
                  <KanbanBoard
                    workflowPort={workflowPort}
                    projects={filteredProjects}
                    taskCreationStates={taskCreationStates}
                    onInspectTaskCreation={inspectTaskCreation}
                    onPreserveTaskDraft={preserveUncertainTaskDraft}
                    unverifiedDuplicationSourceIds={unverifiedDuplicationSourceIds}
                    duplicatingProjectIds={duplicatingProjectIds}
                    columns={projectsPage?.kanban.columns ?? []}
                    memberOptions={memberOptions}
                    labelOptions={labelOptions}
                    onProjectOpen={openProjectDetails}
                    onProjectEdit={openEditProject}
                    onProjectDuplicate={duplicateProject}
                    onProjectDelete={deleteProject}
                    onProjectTaskAdd={addProjectTask}
                    onAddProject={canCreateProject ? openCreateProject : undefined}
                    onMoveProject={projectsPage?.access?.canManageProjects ? moveProjectStatus : undefined}
                  />
                )}

                {(!pageLoading || projects.length > 0) && (!pageError || projects.length > 0) && viewMode === 'grid' && (
                  <GridView
                    workflowPort={workflowPort}
                    projects={filteredProjects}
                    taskCreationStates={taskCreationStates}
                    onInspectTaskCreation={inspectTaskCreation}
                    onPreserveTaskDraft={preserveUncertainTaskDraft}
                    unverifiedDuplicationSourceIds={unverifiedDuplicationSourceIds}
                    duplicatingProjectIds={duplicatingProjectIds}
                    memberOptions={memberOptions}
                    labelOptions={labelOptions}
                    onProjectOpen={openProjectDetails}
                    onProjectEdit={openEditProject}
                    onProjectDuplicate={duplicateProject}
                    onProjectDelete={deleteProject}
                    onProjectTaskAdd={addProjectTask}
                  />
                )}

                {(!pageLoading || projects.length > 0) && (!pageError || projects.length > 0) && viewMode === 'table' && (
                  <TableView
                    projects={filteredProjects}
                    unverifiedDuplicationSourceIds={unverifiedDuplicationSourceIds}
                    duplicatingProjectIds={duplicatingProjectIds}
                    onProjectOpen={openProjectDetails}
                    onProjectEdit={openEditProject}
                    onProjectDuplicate={duplicateProject}
                    onProjectDelete={deleteProject}
                  />
                )}
                {projectsPage && (
                  <ProjectPagination pagination={projectsPage.pagination} pending={pageLoading} stale={Boolean(pageError)} onChange={changeProjectPage} />
                )}
              </section>
            </div>
      </AccessibleShell>
    </>
  );
}
