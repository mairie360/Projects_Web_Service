'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Footer, Header, Sidebar } from '@mairie360/lib-components';
import { Plus, Settings } from 'lucide-react';

import { KanbanBoard } from '../components/Kanban';
import { ActionButton } from '../components/project/ProjectFormControls';
import { CreateProjectModal, ProjectDetailModal } from '../components/project/ProjectModals';
import { FilterSelect, GridView, SearchInput, TableView, ViewToggle } from '../components/project/ProjectViews';
import { appSidebarItems } from '../lib/appShell';
import {
  createProject,
  createProjectBodyFromForm,
  createProjectTask,
  deleteProject as deleteBffProject,
  duplicateProject as duplicateBffProject,
  getBffProjectErrorMessage,
  getProjectDetails,
  getProjectsPage,
  mergeProjectDetails,
  taskBodyFromDraft,
  updateProject,
  updateProjectBodyFromForm,
  updateProjectTask as updateBffProjectTask,
  updateProjectTaskStatus,
  type ProjectDetailsResponse,
  type ProjectsPageResponse,
} from '../lib/bffProjectClient';
import {
  createProjectFormState,
  createSelectOptions,
  defaultProjectLabels,
  defaultProjectMembers,
  priorityOptions,
  projectToFormState,
  statusOptions,
  type FilterOption,
  type ProjectFormState,
  type ViewMode,
} from '../lib/projectPageState';
import { navigateToPage } from '../lib/navigation';
import { logoutAndReload, useAuthSession } from '../lib/auth-session';
import type { Project, ProjectTaskDraft } from '../types/project';

const fallbackUser = {
  name: 'Admin Système',
  email: 'admin@mairie360.fr',
  role: 'admin',
};

type AlertState = {
  type: 'success' | 'info' | 'error';
  message: string;
};

type RefreshProjectsOptions = {
  signal?: AbortSignal;
  search?: string;
  status?: string;
  priority?: string;
  view?: ViewMode;
  silent?: boolean;
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function validateProjectForm(form: ProjectFormState) {
  return Boolean(form.title.trim() && form.description.trim() && form.dueDate);
}

export default function ProjectsPage() {
  const [projectsPage, setProjectsPage] = useState<ProjectsPageResponse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectDetails, setSelectedProjectDetails] = useState<ProjectDetailsResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openFilter, setOpenFilter] = useState<'status' | 'priority' | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(() => createProjectFormState());
  const [projectFormError, setProjectFormError] = useState('');
  const session = useAuthSession(fallbackUser);

  const handlePageChange = (page: string) => {
    navigateToPage(page);
    setSidebarOpen(false);
  };

  const memberOptions = useMemo<FilterOption[]>(
    () =>
      projectsPage?.options.members ??
      createSelectOptions([
        ...defaultProjectMembers,
        ...projects.flatMap((project) => [
          project.responsible.name,
          ...project.assignees.map((assignee) => assignee.name),
        ]),
      ]),
    [projects, projectsPage?.options.members]
  );

  const labelOptions = useMemo<FilterOption[]>(
    () =>
      projectsPage?.options.labels ??
      createSelectOptions([...defaultProjectLabels, ...projects.flatMap((project) => project.labels)]),
    [projects, projectsPage?.options.labels]
  );

  const statusFilterOptions = projectsPage?.filters.statuses ?? statusOptions;
  const priorityFilterOptions = projectsPage?.filters.priorities ?? priorityOptions;

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        project.title.toLowerCase().includes(normalizedSearch) ||
        project.description.toLowerCase().includes(normalizedSearch) ||
        project.labels.some((label) => label.toLowerCase().includes(normalizedSearch));

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [priorityFilter, projects, searchTerm, statusFilter]);

  const refreshProjectsPage = useCallback(
    async (options: RefreshProjectsOptions = {}) => {
      const nextSearch = options.search ?? searchTerm;
      const nextStatus = options.status ?? statusFilter;
      const nextPriority = options.priority ?? priorityFilter;
      const nextView = options.view ?? viewMode;

      if (!options.silent) {
        setPageLoading(true);
      }

      try {
        const response = await getProjectsPage(
          {
            q: nextSearch.trim() || undefined,
            status: nextStatus as Project['status'] | 'all',
            priority: nextPriority as Project['priority'] | 'all',
            view: nextView,
            page: 1,
            limit: 50,
          },
          options.signal
        );

        setProjectsPage(response);
        setProjects(response.projects);
        setPageError('');
      } catch (error) {
        if (isAbortError(error)) return;

        setPageError(getBffProjectErrorMessage(error));
      } finally {
        if (!options.signal?.aborted) {
          setPageLoading(false);
        }
      }
    },
    [priorityFilter, searchTerm, statusFilter, viewMode]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void refreshProjectsPage({ signal: controller.signal });
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [refreshProjectsPage]);

  const showInfo = (message: string) => {
    setAlert({ type: 'info', message });
  };

  const showError = (error: unknown) => {
    setAlert({ type: 'error', message: getBffProjectErrorMessage(error) });
  };

  const refreshProjectDetails = async (projectId: string) => {
    const details = await getProjectDetails(projectId);
    const projectWithTasks = mergeProjectDetails(details);

    setProjects((currentProjects) =>
      currentProjects.map((project) => (project.id === projectId ? { ...project, ...projectWithTasks } : project))
    );

    if (selectedProjectDetails?.project.id === projectId) {
      setSelectedProjectDetails(details);
    }

    return details;
  };

  const openCreateProject = (status: Project['status'] = 'todo') => {
    setProjectForm(createProjectFormState(status));
    setEditingProjectId(null);
    setProjectFormError('');
    setOpenFilter(null);
    setCreateProjectOpen(true);
  };

  const openProjectDetails = async (project: Project) => {
    setOpenFilter(null);

    try {
      setSelectedProjectDetails(await getProjectDetails(project.id));
    } catch (error) {
      showError(error);
    }
  };

  const openEditProject = async (project: Project) => {
    setEditingProjectId(project.id);
    setProjectFormError('');
    setOpenFilter(null);

    try {
      const details = await getProjectDetails(project.id);
      setProjectForm(projectToFormState(mergeProjectDetails(details)));
    } catch (error) {
      setProjectForm(projectToFormState(project));
      showError(error);
    }

    setCreateProjectOpen(true);
  };

  const closeCreateProject = () => {
    setCreateProjectOpen(false);
    setEditingProjectId(null);
    setProjectFormError('');
  };

  const updateProjectForm = (patch: Partial<ProjectFormState>) => {
    setProjectForm((current) => ({ ...current, ...patch }));
    if (projectFormError) setProjectFormError('');
  };

  const updateProjectFromForm = async (projectId: string, form: ProjectFormState) => {
    if (!validateProjectForm(form)) {
      setAlert({ type: 'error', message: 'Les champs obligatoires doivent être renseignés.' });
      return;
    }

    try {
      const details = await updateProject(projectId, updateProjectBodyFromForm(form));
      setSelectedProjectDetails(details);
      await refreshProjectsPage({ silent: true });
      setAlert({ type: 'success', message: `Projet "${details.project.title}" modifié.` });
    } catch (error) {
      showError(error);
    }
  };

  const saveProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateProjectForm(projectForm)) {
      setProjectFormError('Les champs obligatoires doivent être renseignés.');
      return;
    }

    try {
      if (editingProjectId) {
        const details = await updateProject(editingProjectId, updateProjectBodyFromForm(projectForm));

        setCreateProjectOpen(false);
        setEditingProjectId(null);
        setSelectedProjectDetails((currentDetails) =>
          currentDetails?.project.id === editingProjectId ? details : currentDetails
        );
        await refreshProjectsPage({ silent: true });
        setAlert({ type: 'success', message: `Projet "${details.project.title}" modifié.` });
        return;
      }

      const details = await createProject(createProjectBodyFromForm(projectForm));

      setSearchTerm('');
      setStatusFilter('all');
      setPriorityFilter('all');
      setCreateProjectOpen(false);
      setSelectedProjectDetails(details);
      await refreshProjectsPage({ search: '', status: 'all', priority: 'all', silent: true });
      setAlert({ type: 'success', message: `Projet "${details.project.title}" créé.` });
    } catch (error) {
      showError(error);
    }
  };

  const duplicateProject = async (project: Project) => {
    try {
      const details = await duplicateBffProject(project.id);

      setSearchTerm('');
      setStatusFilter('all');
      setPriorityFilter('all');
      await refreshProjectsPage({ search: '', status: 'all', priority: 'all', silent: true });
      setAlert({ type: 'success', message: `Projet "${details.project.title}" dupliqué.` });
    } catch (error) {
      showError(error);
    }
  };

  const deleteProject = async (project: Project) => {
    const confirmed = window.confirm(`Supprimer le projet "${project.title}" ?`);
    if (!confirmed) return;

    try {
      await deleteBffProject(project.id);
      if (selectedProjectDetails?.project.id === project.id) setSelectedProjectDetails(null);
      if (editingProjectId === project.id) closeCreateProject();
      await refreshProjectsPage({ silent: true });
      setAlert({ type: 'success', message: `Projet "${project.title}" supprimé.` });
    } catch (error) {
      showError(error);
    }
  };

  const addProjectTask = async (project: Project, taskDraft: ProjectTaskDraft) => {
    const title = taskDraft.title.trim();
    if (!title) return;

    try {
      await createProjectTask(project.id, taskBodyFromDraft(taskDraft));
      await refreshProjectDetails(project.id);
      await refreshProjectsPage({ silent: true });
      setAlert({ type: 'success', message: `Tâche "${title}" ajoutée à "${project.title}".` });
    } catch (error) {
      showError(error);
    }
  };

  const updateProjectTask = async (projectId: string, taskId: string, taskDraft: ProjectTaskDraft) => {
    const title = taskDraft.title.trim();
    if (!title) return;

    try {
      await updateBffProjectTask(projectId, taskId, taskBodyFromDraft(taskDraft));
      await refreshProjectDetails(projectId);
      await refreshProjectsPage({ silent: true });
      setAlert({ type: 'success', message: `Tâche "${title}" modifiée.` });
    } catch (error) {
      showError(error);
    }
  };

  const toggleProjectTask = async (projectId: string, taskId: string) => {
    const project =
      selectedProjectDetails?.project.id === projectId
        ? mergeProjectDetails(selectedProjectDetails)
        : projects.find((currentProject) => currentProject.id === projectId);
    const task = project?.taskItems?.find((currentTask) => currentTask.id === taskId);

    if (!task) return;

    try {
      await updateProjectTaskStatus(projectId, taskId, task.completed || task.status === 'done' ? 'todo' : 'done');
      await refreshProjectDetails(projectId);
      await refreshProjectsPage({ silent: true });
    } catch (error) {
      showError(error);
    }
  };

  const selectedProject = selectedProjectDetails?.project ?? null;
  const selectedProjectTasks = selectedProjectDetails?.taskItems ?? [];
  const pageTitle = projectsPage?.page.title ?? 'Projets';
  const pageSubtitle =
    projectsPage?.page.subtitle ?? 'Gérez vos projets municipaux avec des vues Kanban, tableau et grille';

  return (
    <div className="h-screen overflow-hidden bg-[#f6f4f1] text-[#172033]">
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          tasks={selectedProjectTasks}
          memberOptions={memberOptions}
          labelOptions={labelOptions}
          onClose={() => setSelectedProjectDetails(null)}
          onUpdateProject={updateProjectFromForm}
          onAddTask={addProjectTask}
          onUpdateTask={updateProjectTask}
          onToggleTask={toggleProjectTask}
        />
      )}

      {createProjectOpen && (
        <CreateProjectModal
          mode={editingProjectId ? 'edit' : 'create'}
          form={projectForm}
          error={projectFormError}
          memberOptions={memberOptions}
          labelOptions={labelOptions}
          onChange={updateProjectForm}
          onClose={closeCreateProject}
          onSubmit={saveProject}
        />
      )}

      <div className="flex h-full">
        <div className="hidden shrink-0 lg:block">
          <Sidebar
            activeItem="projects"
            isAdmin={session.isAdmin}
            items={appSidebarItems}
            brandLabel="Mairie360"
            brandInitial="M"
            onItemSelect={(item) => handlePageChange(item.id)}
          />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <button
              type="button"
              aria-label="Fermer la navigation"
              className="absolute inset-0 bg-black/30"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative z-10">
              <Sidebar
                activeItem="projects"
                isAdmin={session.isAdmin}
                items={appSidebarItems}
                brandLabel="Mairie360"
                brandInitial="M"
                onItemSelect={(item) => handlePageChange(item.id)}
              />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            user={session.user}
            isAdmin={session.isAdmin}
            setSidebarOpen={setSidebarOpen}
            profileHref="/profile"
            onPageChange={handlePageChange}
            onLogout={() => void logoutAndReload()}
          />

          <main className="min-h-0 flex-1 overflow-y-auto bg-[#f6f4f1]">
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
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <ActionButton label="Nouveau projet" icon={Plus} primary onClick={() => openCreateProject()} />
                    <ActionButton
                      label="Paramètres"
                      icon={Settings}
                      onClick={() => showInfo('Paramètres en cours de développement.')}
                    />
                  </div>
                </div>
              </section>

              <section className="border-b border-[#e3e0dc] py-7">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-1 flex-col gap-3 md:flex-row">
                    <SearchInput value={searchTerm} onChange={setSearchTerm} />
                    <div className="flex flex-col gap-3 sm:flex-row">
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
                    </div>
                  </div>

                  <ViewToggle value={viewMode} onChange={setViewMode} />
                </div>
              </section>

              <section className="pt-8">
                {pageLoading && projects.length === 0 && (
                  <div className="rounded-md border border-[#d9d5d0] bg-white px-5 py-8 text-sm font-medium text-[#57606a]">
                    Chargement des projets...
                  </div>
                )}

                {pageError && projects.length === 0 && !pageLoading && (
                  <div className="rounded-md border border-[#ffcecb] bg-[#ffebe9] px-5 py-4 text-sm font-medium text-[#cf222e]">
                    {pageError}
                  </div>
                )}

                {(!pageLoading || projects.length > 0) && !pageError && viewMode === 'kanban' && (
                  <KanbanBoard
                    projects={filteredProjects}
                    memberOptions={memberOptions}
                    labelOptions={labelOptions}
                    onProjectOpen={openProjectDetails}
                    onProjectEdit={openEditProject}
                    onProjectDuplicate={duplicateProject}
                    onProjectDelete={deleteProject}
                    onProjectTaskAdd={addProjectTask}
                    onAddProject={openCreateProject}
                  />
                )}

                {(!pageLoading || projects.length > 0) && !pageError && viewMode === 'grid' && (
                  <GridView
                    projects={filteredProjects}
                    memberOptions={memberOptions}
                    labelOptions={labelOptions}
                    onProjectOpen={openProjectDetails}
                    onProjectEdit={openEditProject}
                    onProjectDuplicate={duplicateProject}
                    onProjectDelete={deleteProject}
                    onProjectTaskAdd={addProjectTask}
                  />
                )}

                {(!pageLoading || projects.length > 0) && !pageError && viewMode === 'table' && (
                  <TableView
                    projects={filteredProjects}
                    onProjectOpen={openProjectDetails}
                    onProjectEdit={openEditProject}
                    onProjectDuplicate={duplicateProject}
                    onProjectDelete={deleteProject}
                  />
                )}
              </section>
            </div>
          </main>

          <Footer productName="Mairie360" year={2026} version="2.1.0" className="shrink-0" />
        </div>
      </div>
    </div>
  );
}
