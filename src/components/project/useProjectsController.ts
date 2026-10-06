'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createProject,
  createProjectBodyFromForm,
  createProjectTask,
  closeProject as closeBffProject,
  deleteProject as deleteBffProject,
  deleteProjectTask as deleteBffProjectTask,
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
} from '../../lib/bffProjectClient';
import {
  createProjectFormState,
  createSelectOptions,
  projectToFormState,
  type FilterOption,
  type ProjectFormState,
  type ViewMode,
} from '../../lib/projectPageState';
import { getActiveFrontHrefs } from '../../lib/navigation';
import { authSessionFromAccess } from '../../lib/auth-session';
import { parseProjectDeepLink } from '../../lib/projectDeepLink';
import { isProjectPaginationValid } from '../../lib/projectPagination';
import type { Project, ProjectStatus, ProjectTaskDraft } from '../../types/project';

type AlertState = {
  type: 'success' | 'info' | 'error';
  message: string;
};

type RefreshProjectsOptions = {
  signal?: AbortSignal;
  search?: string;
  status?: string;
  priority?: string;
  dueBefore?: string;
  view?: ViewMode;
  page?: number;
  silent?: boolean;
  throwOnError?: boolean;
};

type ProjectQueryState = {
  search: string;
  status: string;
  priority: string;
  dueBefore: string;
  view: ViewMode;
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function validateProjectForm(form: ProjectFormState) {
  return Boolean(
    form.title.trim() &&
      form.description.trim() &&
      form.dueDate &&
      (form.responsible.trim() || form.assignees.length > 0)
  );
}

export function useProjectsController() {
  const [projectsPage, setProjectsPage] = useState<ProjectsPageResponse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectDetails, setSelectedProjectDetails] = useState<ProjectDetailsResponse | null>(null);
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dueBeforeFilter, setDueBeforeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [openFilter, setOpenFilter] = useState<'status' | 'priority' | null>(null);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const retryPendingRef = useRef(false);
  const pageRevisionRef = useRef(0);
  const requestedPageRef = useRef(1);
  const pageReadPendingRef = useRef(false);
  const navigationReadRef = useRef<AbortController | null>(null);
  // Async writes must read the latest event-owned query, not a render captured
  // before their response. UI state remains the owner of the displayed controls.
  const queryRef = useRef<ProjectQueryState>({
    search: '', status: 'all', priority: 'all', dueBefore: '', view: 'kanban',
  });
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectPendingDeletion, setProjectPendingDeletion] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(() => createProjectFormState());
  const [projectFormError, setProjectFormError] = useState('');
  const [projectFormPending, setProjectFormPending] = useState(false);
  const projectFormPendingRef = useRef(false);
  const duplicatingProjects = useRef(new Set<string>());
  const [duplicatingProjectIds, setDuplicatingProjectIds] = useState<string[]>([]);
  // La session vient de la réponse /projects-page déjà chargée : aucun appel supplémentaire.
  const session = useMemo(() => authSessionFromAccess(projectsPage?.access ?? null), [projectsPage]);

  const memberOptions = useMemo<FilterOption[]>(
    () =>
      projectsPage?.options.members ??
      createSelectOptions([
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
      createSelectOptions(projects.flatMap((project) => project.labels)),
    [projects, projectsPage?.options.labels]
  );

  const statusOptionsFromBff = projectsPage?.filters.statuses;
  const priorityOptionsFromBff = projectsPage?.filters.priorities;
  const statusFilterOptions = useMemo(
    () => statusOptionsFromBff ? [
      { value: 'all', label: 'Tous les statuts' },
      ...statusOptionsFromBff.filter((option) => option.value !== 'all'),
    ] : [],
    [statusOptionsFromBff]
  );
  const priorityFilterOptions = useMemo(
    () => priorityOptionsFromBff ? [
      { value: 'all', label: 'Toutes les priorités' },
      ...priorityOptionsFromBff.filter((option) => option.value !== 'all'),
    ] : [],
    [priorityOptionsFromBff]
  );
  const projectStatusOptions = useMemo(
    () => statusFilterOptions.filter((option) => option.value !== 'all'),
    [statusFilterOptions]
  );
  const projectPriorityOptions = useMemo(
    () => priorityFilterOptions.filter((option) => option.value !== 'all'),
    [priorityFilterOptions]
  );

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

      const matchesDueDate = !dueBeforeFilter || project.dueDate.slice(0, 10) <= dueBeforeFilter;

      return matchesStatus && matchesPriority && matchesSearch && matchesDueDate;
    });
  }, [dueBeforeFilter, priorityFilter, projects, searchTerm, statusFilter]);

  const refreshProjectsPage = useCallback(
    async (options: RefreshProjectsOptions = {}) => {
      const revision = ++pageRevisionRef.current;
      const isCurrent = () => revision === pageRevisionRef.current && !options.signal?.aborted;
      const query = queryRef.current;
      const nextSearch = options.search ?? query.search;
      const nextStatus = options.status ?? query.status;
      const nextPriority = options.priority ?? query.priority;
      const nextDueBefore = options.dueBefore ?? query.dueBefore;
      const nextView = options.view ?? query.view;
      const nextPage = options.page ?? requestedPageRef.current;
      pageReadPendingRef.current = true;
      // Even a silent post-mutation refresh locks paging; retained rows stay mounted.
      setPageLoading(true);

      try {
        const response = await getProjectsPage(
          {
            q: nextSearch.trim() || undefined,
            status: nextStatus as Project['status'] | 'all',
            priority: nextPriority as Project['priority'] | 'all',
            dueBefore: nextDueBefore || undefined,
            view: nextView,
            page: nextPage,
            limit: 50,
          },
          options.signal
        );

        // Neither an older read nor an aborted filter request may undo a confirmed write.
        if (!isCurrent()) return;
        if (!isProjectPaginationValid(response.pagination, nextPage)) {
          throw new Error('La pagination reçue est incohérente. Réessayez le chargement des projets.');
        }
        setProjectsPage(response);
        setProjects(response.projects);
        setPageError('');
      } catch (error) {
        if (isAbortError(error) || !isCurrent()) return;

        setPageError(getBffProjectErrorMessage(error));
        if (options.throwOnError) throw error;
      } finally {
        if (isCurrent()) {
          pageReadPendingRef.current = false;
          setPageLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void refreshProjectsPage({ signal: controller.signal });
    }, 250);

    return () => {
      controller.abort();
      navigationReadRef.current?.abort();
      window.clearTimeout(timeoutId);
    };
  }, [refreshProjectsPage, dueBeforeFilter, priorityFilter, searchTerm, statusFilter, viewMode]);

  const retryProjectsPage = async () => {
    if (pageLoading || pageReadPendingRef.current || retryPendingRef.current) return;
    retryPendingRef.current = true;
    try {
      // Retry the read with current filters; never replay a confirmed mutation.
      await refreshProjectsPage();
    } finally {
      retryPendingRef.current = false;
    }
  };

  const changeProjectPage = async (direction: 'previous' | 'next') => {
    const pagination = projectsPage?.pagination;
    if (pageLoading || pageReadPendingRef.current || pageError || !pagination) return;
    if (direction === 'previous' ? pagination.page <= 1 : !pagination.hasNextPage) return;
    const nextPage = pagination.page + (direction === 'previous' ? -1 : 1);
    requestedPageRef.current = nextPage;
    setOpenFilter(null);
    const controller = new AbortController();
    navigationReadRef.current = controller;
    // The event owns this read: changing the requested page must not schedule another GET.
    await refreshProjectsPage({ page: nextPage, signal: controller.signal });
  };

  const prepareQueryChange = (firstPage: boolean) => {
    ++pageRevisionRef.current;
    navigationReadRef.current?.abort();
    if (firstPage) requestedPageRef.current = 1;
    pageReadPendingRef.current = true;
    setPageLoading(true);
  };

  const changeSearchTerm = (value: string) => {
    if (value === queryRef.current.search) return;
    prepareQueryChange(true);
    queryRef.current = { ...queryRef.current, search: value };
    setSearchTerm(value);
  };
  const changeStatusFilter = (value: string) => {
    if (value === queryRef.current.status) return;
    prepareQueryChange(true);
    queryRef.current = { ...queryRef.current, status: value };
    setStatusFilter(value);
  };
  const changePriorityFilter = (value: string) => {
    if (value === queryRef.current.priority) return;
    prepareQueryChange(true);
    queryRef.current = { ...queryRef.current, priority: value };
    setPriorityFilter(value);
  };
  const changeDueBeforeFilter = (value: string) => {
    if (value === queryRef.current.dueBefore) return;
    prepareQueryChange(true);
    queryRef.current = { ...queryRef.current, dueBefore: value };
    setDueBeforeFilter(value);
  };
  const changeViewMode = (value: ViewMode) => {
    if (value === queryRef.current.view) return;
    prepareQueryChange(false);
    queryRef.current = { ...queryRef.current, view: value };
    setViewMode(value);
  };

  const resetProjectFilters = () => {
    requestedPageRef.current = 1;
    queryRef.current = { ...queryRef.current, search: '', status: 'all', priority: 'all', dueBefore: '' };
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setDueBeforeFilter('');
  };

  const showInfo = (message: string) => {
    setAlert({ type: 'info', message });
  };

  const showError = (error: unknown) => {
    setAlert({ type: 'error', message: getBffProjectErrorMessage(error) });
  };

  const applyConfirmedProject = (details: ProjectDetailsResponse, insert = false) => {
    ++pageRevisionRef.current;
    const confirmed = mergeProjectDetails(details);
    setProjects((current) => current.some((project) => project.id === confirmed.id)
      ? current.map((project) => project.id === confirmed.id ? confirmed : project)
      : insert ? [...current, confirmed] : current);
    // Page totals, options and pagination still belong to the last successful page DTO.
  };

  useEffect(() => {
    const target = parseProjectDeepLink(window.location.search ?? '');
    if (!target) return;
    if ('error' in target) {
      setAlert({ type: 'error', message: target.error });
      return;
    }

    let active = true;
    void getProjectDetails(target.projectId).then((details) => {
      if (!active) return;
      if (target.taskId && !details.taskItems.some((task: { id: string }) => task.id === target.taskId)) {
        setAlert({ type: 'error', message: 'La tâche demandée est introuvable dans ce projet.' });
        return;
      }
      setSelectedProjectDetails(details);
      setLinkedTaskId(target.taskId);
    }).catch((error) => {
      if (active) setAlert({ type: 'error', message: getBffProjectErrorMessage(error) });
    });
    return () => { active = false; };
  }, []);

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
    if (projectFormPendingRef.current) return;
    setProjectForm(createProjectFormState(status));
    setEditingProjectId(null);
    setProjectFormError('');
    setOpenFilter(null);
    setCreateProjectOpen(true);
  };

  const openProjectDetails = async (project: Project) => {
    setOpenFilter(null);
    setLinkedTaskId(null);

    try {
      setSelectedProjectDetails(await getProjectDetails(project.id));
    } catch (error) {
      showError(error);
    }
  };

  const openEditProject = async (project: Project) => {
    if (projectFormPendingRef.current) return;
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
    if (projectFormPendingRef.current) return;
    setCreateProjectOpen(false);
    setEditingProjectId(null);
    setProjectFormError('');
  };

  const updateProjectForm = (patch: Partial<ProjectFormState>) => {
    if (projectFormPendingRef.current) return;
    setProjectForm((current) => ({ ...current, ...patch }));
    if (projectFormError) setProjectFormError('');
  };

  const updateProjectFromForm = async (projectId: string, form: ProjectFormState) => {
    if (!validateProjectForm(form)) {
      const error = new Error('Les champs obligatoires doivent être renseignés.');
      showError(error);
      throw error;
    }

    let details: ProjectDetailsResponse;
    try {
      details = await updateProject(projectId, updateProjectBodyFromForm(form));
    } catch (error) {
      showError(error);
      throw error;
    }
    applyConfirmedProject(details);
    setSelectedProjectDetails(details);
    try {
      await refreshProjectsPage({ silent: true, throwOnError: true });
      setAlert({ type: 'success', message: `Projet "${details.project.title}" modifié.` });
    } catch (error) {
      // The mutation is confirmed: a failed refresh must not invite a second PATCH.
      setAlert({ type: 'info', message: `Projet "${details.project.title}" enregistré. Actualisation impossible : ${getBffProjectErrorMessage(error)}` });
    }
  };

  const moveProjectStatus = async (project: Project, status: ProjectStatus) => {
    if (project.status === status || !projectsPage?.access?.canManageProjects || project.permissions?.canEdit !== true) return;

    try {
      const details = await updateProject(project.id, { status });
      applyConfirmedProject(details);
      setSelectedProjectDetails((current: ProjectDetailsResponse | null) => current?.project.id === project.id ? details : current);
      await refreshProjectsPage({ silent: true });
      setAlert({ type: 'success', message: `Statut du projet "${project.title}" mis à jour.` });
    } catch (error) {
      showError(error);
    }
  };

  const saveProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // The ref also protects two events captured before React renders disabled controls.
    if (projectFormPendingRef.current) return;

    if (!validateProjectForm(projectForm)) {
      setProjectFormError('Les champs obligatoires doivent être renseignés.');
      return;
    }

    projectFormPendingRef.current = true;
    setProjectFormPending(true);
    setProjectFormError('');
    try {
      const details = editingProjectId
        ? await updateProject(editingProjectId, updateProjectBodyFromForm(projectForm))
        : await createProject(createProjectBodyFromForm(projectForm));
      applyConfirmedProject(details, !editingProjectId);

      // Only the confirmed write discards the draft. A later read failure is not a refusal.
      setCreateProjectOpen(false);
      setEditingProjectId(null);
      setProjectForm(createProjectFormState());
      if (editingProjectId) {
        setSelectedProjectDetails((currentDetails) =>
          currentDetails?.project.id === editingProjectId ? details : currentDetails
        );
      } else {
        resetProjectFilters();
        setSelectedProjectDetails(details);
      }
      try {
        await refreshProjectsPage(editingProjectId
          ? { silent: true, throwOnError: true }
          : { search: '', status: 'all', priority: 'all', dueBefore: '', page: 1, silent: true, throwOnError: true });
        setAlert({ type: 'success', message: `Projet "${details.project.title}" ${editingProjectId ? 'modifié' : 'créé'}.` });
      } catch (error) {
        setAlert({ type: 'info', message: `Projet "${details.project.title}" enregistré. Actualisation impossible : ${getBffProjectErrorMessage(error)}` });
      }
    } catch (error) {
      // A refused write keeps every field and nested task, with an error inside the dialog.
      setProjectFormError(getBffProjectErrorMessage(error));
    } finally {
      projectFormPendingRef.current = false;
      setProjectFormPending(false);
    }
  };

  const duplicateProject = async (project: Project) => {
    if (project.permissions?.canDuplicate === false || duplicatingProjects.current.has(project.id)) return;
    // Prevent a second event before React renders the disabled action.
    duplicatingProjects.current.add(project.id);
    setDuplicatingProjectIds((current) => [...current, project.id]);
    try {
      const details = await duplicateBffProject(project.id);
      applyConfirmedProject(details, true);

      resetProjectFilters();
      await refreshProjectsPage({ search: '', status: 'all', priority: 'all', dueBefore: '', page: 1, silent: true });
      setAlert({ type: 'success', message: `Projet "${details.project.title}" dupliqué.` });
    } catch (error) {
      showError(error);
    } finally {
      duplicatingProjects.current.delete(project.id);
      setDuplicatingProjectIds((current) => current.filter((id) => id !== project.id));
    }
  };

  const deleteProject = async (project: Project) => {
    setProjectPendingDeletion(project);
  };

  const confirmProjectDeletion = async () => {
    const project = projectPendingDeletion;
    if (!project) return;

    try {
      await deleteBffProject(project.id);
      ++pageRevisionRef.current;
      setProjects((current) => current.filter((value) => value.id !== project.id));
      setProjectPendingDeletion(null);
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
    } catch (error) {
      showError(error);
      throw error;
    }
    // The write is confirmed. A failed refresh must not offer the same POST again.
    try {
      await refreshProjectDetails(project.id);
      await refreshProjectsPage({ silent: true });
      setAlert({ type: 'success', message: `Tâche "${title}" ajoutée à "${project.title}".` });
    } catch (error) {
      showInfo(`Tâche "${title}" enregistrée. Actualisation impossible : ${getBffProjectErrorMessage(error)}`);
    }
  };

  const updateProjectTask = async (projectId: string, taskId: string, taskDraft: ProjectTaskDraft) => {
    const title = taskDraft.title.trim();
    if (!title) return;

    try {
      await updateBffProjectTask(projectId, taskId, taskBodyFromDraft(taskDraft));
    } catch (error) {
      showError(error);
      throw error;
    }
    try {
      await refreshProjectDetails(projectId);
      await refreshProjectsPage({ silent: true });
      setAlert({ type: 'success', message: `Tâche "${title}" modifiée.` });
    } catch (error) {
      showInfo(`Tâche "${title}" enregistrée. Actualisation impossible : ${getBffProjectErrorMessage(error)}`);
    }
  };

  const changeProjectTaskStatus = async (
    projectId: string,
    taskId: string,
    status: ProjectStatus
  ) => {
    try {
      const updatedTask = await updateProjectTaskStatus(projectId, taskId, status);
      await refreshProjectDetails(projectId);
      await refreshProjectsPage({ silent: true });
      setAlert({
        type: 'success',
        message: `Statut de la tâche "${updatedTask.title}" mis à jour : ${updatedTask.statusLabel ?? status}.`,
      });
    } catch (error) {
      showError(error);
    }
  };

  const deleteProjectTask = async (projectId: string, taskId: string, taskTitle: string) => {
    try {
      await deleteBffProjectTask(projectId, taskId);
      await refreshProjectDetails(projectId);
      await refreshProjectsPage({ silent: true });
      setAlert({ type: 'success', message: `Tâche "${taskTitle}" supprimée.` });
    } catch (error) {
      showError(error);
    }
  };

  const closeProject = async (projectId: string, status: 'done' | 'review') => {
    try {
      const details = await closeBffProject(projectId, status);
      applyConfirmedProject(details);
      setSelectedProjectDetails(details);
      await refreshProjectsPage({ silent: true });
      setAlert({
        type: 'success',
        message: status === 'done' ? `Projet "${details.project.title}" clôturé.` : `Projet "${details.project.title}" suspendu.`,
      });
    } catch (error) {
      showError(error);
    }
  };

  const selectedProject = selectedProjectDetails?.project ?? null;
  const selectedProjectTasks = selectedProjectDetails?.taskItems ?? [];
  const canCreateProject =
    projectsPage?.access?.canCreateProject ?? false;
  const pageTitle = projectsPage?.page.title ?? 'Projets';
  const pageSubtitle = projectsPage?.page.subtitle ?? '';
  const frontHrefs = getActiveFrontHrefs();

  return {
    projectsPage,
    projects,
    setSelectedProjectDetails,
    linkedTaskId,
    setLinkedTaskId,
    viewMode,
    setViewMode: changeViewMode,
    statusFilter,
    setStatusFilter: changeStatusFilter,
    priorityFilter,
    setPriorityFilter: changePriorityFilter,
    dueBeforeFilter,
    setDueBeforeFilter: changeDueBeforeFilter,
    searchTerm,
    setSearchTerm: changeSearchTerm,
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
  };
}

export type ProjectsController = ReturnType<typeof useProjectsController>;
