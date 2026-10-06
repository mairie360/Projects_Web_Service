'use client';

import React from 'react';
import { Alert, AppShell } from '@mairie360/lib-components';
import { Plus, Settings } from 'lucide-react';
import { KanbanBoard } from '../Kanban';
import { ActionButton } from './ProjectFormControls';
import { CreateProjectModal } from './CreateProjectModal';
import { ProjectDetailModal } from './ProjectDetailModal';
import { ProjectPagination } from './ProjectPagination';
import { FilterSelect, GridView, SearchInput, TableView, ViewToggle } from './ProjectViews';
import { navigateToPage } from '../../lib/navigation';
import { logoutAndReload } from '../../lib/auth-session';
import type { ProjectsController } from './useProjectsController';

export function ProjectsWorkspace({
  projectsPage,
  projects,
  closeProjectDetails,
  detailRefreshError,
  detailRefreshPending,
  pendingTaskIds,
  taskWriteErrors,
  unverifiedTaskIds,
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
}: ProjectsController) {
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
          tasks={selectedProjectTasks}
          highlightTaskId={linkedTaskId}
          memberOptions={memberOptions}
          labelOptions={labelOptions}
          statusOptions={projectStatusOptions}
          priorityOptions={projectPriorityOptions}
          onClose={closeProjectDetails}
          refreshError={detailRefreshError}
          refreshPending={detailRefreshPending}
          pendingTaskIds={pendingTaskIds}
          taskWriteErrors={taskWriteErrors}
          unverifiedTaskIds={unverifiedTaskIds}
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
          mode={editingProjectId ? 'edit' : 'create'}
          form={projectForm}
          error={projectFormError}
          pending={projectFormPending}
          memberOptions={memberOptions}
          labelOptions={labelOptions}
          statusOptions={projectStatusOptions}
          priorityOptions={projectPriorityOptions}
          onChange={updateProjectForm}
          onClose={closeCreateProject}
          onSubmit={saveProject}
        />
      )}

      <AppShell
        activeItem="projects"
        isAdmin={session.isAdmin}
        user={session.user}
        onLogout={() => void logoutAndReload()}
        hrefs={{ ...frontHrefs, projects: frontHrefs.projects ?? '/' }}
        className="projects-shell"
      >
            <div className="mx-auto w-full max-w-[1660px] px-6 py-10 lg:px-14 lg:py-14">
              {alert && (
                <div className="mb-5">
                  <Alert
                    type={alert.type}
                    message={alert.message}
                    closable
                    autoDismiss={3000}
                    onClose={() => setAlert(null)}
                  />
                </div>
              )}

              <section className="border-b border-[#dedbd6] pb-8">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold leading-tight text-[#172033]">{pageTitle}</h1>
                    <p className="mt-2 text-sm text-[#536171]">{pageSubtitle}</p>
                    {projectsPage?.access && (
                      <span className="mt-3 inline-flex rounded-full border border-[#b9d6d5] bg-[#d4eeee] px-3 py-1 text-xs font-semibold text-[#2b706c]">
                        {projectsPage.access.scope === 'all' ? 'Tous les projets municipaux' : projectsPage.access.scope === 'team' ? 'Projets de mon équipe' : 'Mes projets assignés'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {canCreateProject && (
                      <ActionButton label="Nouveau projet" icon={Plus} primary onClick={() => openCreateProject()} />
                    )}
                    <ActionButton
                      label="Paramètres"
                      icon={Settings}
                      onClick={() => navigateToPage('settings')}
                    />
                  </div>
                </div>
              </section>

              <section className="border-b border-[#e3e0dc] py-7">
                <div className="flex flex-col items-start gap-4 2xl:flex-row 2xl:flex-wrap 2xl:items-center 2xl:justify-between">
                  <div className="flex w-full min-w-0 flex-1 flex-col gap-3 xl:flex-row xl:items-center 2xl:basis-[50rem]">
                    <div className="w-full md:min-w-[280px] md:max-w-[448px] md:flex-1 2xl:min-w-[240px]">
                      <SearchInput value={searchTerm} onChange={setSearchTerm} />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <FilterSelect
                        label="Filtrer par statut"
                        value={statusFilter}
                        options={statusFilterOptions}
                        open={openFilter === 'status'}
                        onOpenChange={(open) => setOpenFilter(open ? 'status' : null)}
                        onChange={setStatusFilter}
                      />
                      <FilterSelect
                        label="Filtrer par priorité"
                        value={priorityFilter}
                        options={priorityFilterOptions}
                        open={openFilter === 'priority'}
                        widthClassName="sm:w-48"
                        onOpenChange={(open) => setOpenFilter(open ? 'priority' : null)}
                        onChange={setPriorityFilter}
                      />
                      <label className="relative block w-full sm:w-44" title="Filtrer par échéance maximale">
                        <span className="sr-only">Échéance avant</span>
                        <input
                          type="date"
                          aria-label="Échéance avant"
                          value={dueBeforeFilter}
                          className={`peer h-10 w-full rounded-md border border-[#d0ccc7] bg-white px-3 text-sm font-normal shadow-sm outline-none transition focus:border-[#4b908d] focus:text-[#2f3438] focus:ring-2 focus:ring-[#4b908d]/15 ${
                            dueBeforeFilter ? 'text-[#2f3438]' : 'text-transparent'
                          }`}
                          onChange={(event) => setDueBeforeFilter(event.target.value)}
                        />
                        {!dueBeforeFilter && (
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#2f3438] peer-focus:hidden">
                            Échéance avant
                          </span>
                        )}
                      </label>
                    </div>
                  </div>

                  <ViewToggle
                    value={viewMode}
                    options={projectsPage?.page.views ?? []}
                    onChange={setViewMode}
                  />
                </div>
              </section>

              <section className="pt-8">
                {duplicatingProjectIds.length > 0 && (
                  <p role="status" className="mb-4 text-sm font-medium text-[#57606a]">
                    Duplication du projet en cours…
                  </p>
                )}
                {pageLoading && projects.length === 0 && (
                  <div className="rounded-md border border-[#d9d5d0] bg-white px-5 py-8 text-sm font-medium text-[#57606a]">
                    Chargement des projets...
                  </div>
                )}

                {pageError && (
                  <div role="alert" className="mb-5 rounded-md border border-[#ffcecb] bg-[#ffebe9] px-5 py-4 text-sm font-medium text-[#cf222e]">
                    <div>{pageError}</div>
                    {projects.length > 0 && (
                      <p className="mt-2">Dernières données reçues et confirmations conservées : la liste n’a pas pu être actualisée. Les statistiques restent celles de la dernière lecture réussie.</p>
                    )}
                    <button
                      type="button"
                      disabled={pageLoading}
                      aria-busy={pageLoading}
                      className="mt-3 rounded-md border border-[#cf222e] bg-white px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cf222e] disabled:cursor-wait disabled:opacity-60"
                      onClick={() => void retryProjectsPage()}
                    >
                      Réessayer
                    </button>
                    {pageLoading && <p role="status" className="mt-2">Actualisation des projets...</p>}
                  </div>
                )}

                {(!pageLoading || projects.length > 0) && (!pageError || projects.length > 0) && viewMode === 'kanban' && (
                  <KanbanBoard
                    projects={filteredProjects}
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
                    projects={filteredProjects}
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
      </AppShell>
    </>
  );
}
