'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BffProjectError,
  BffProjectNavigationRequiredError,
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
import { applyTaskConfirmations, reconcileTaskConfirmations, taskConfirmationsAfter, type TaskConfirmation } from '../../lib/projectTaskConfirmations';
import { assertProjectDetailsIdentity, ProjectTaskVerificationRequiredError, TASK_VERIFICATION_MESSAGE } from '../../lib/projectTaskVerification';
import { ProjectReceiptVerificationRequiredError, PROJECT_VERIFICATION_MESSAGE } from '../../lib/projectReceiptVerification';
import type { Project, ProjectStatus, ProjectTask, ProjectTaskDraft } from '../../types/project';

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

type DetailSelection = { projectId: string; readRevision: number };
type TaskConfirmations = { revision: number; changes: Map<string, ProjectTask | null>; latest: Map<string, TaskConfirmation> };
type SelectedProjectDetails = { project: Project; taskItems: ProjectTask[] };
type ConfirmedProject = { details: SelectedProjectDetails; newerTasks: boolean };

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
  const [selectedProjectDetails, setSelectedProjectDetails] = useState<SelectedProjectDetails | null>(null);
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
  // Each opening owns a distinct lifetime, even when reopening the same ID.
  const detailSelectionRef = useRef<DetailSelection | null>(null);
  const taskConfirmationsRef = useRef(new Map<string, TaskConfirmations>());
  const [detailRefreshError, setDetailRefreshError] = useState('');
  const [detailRefreshPending, setDetailRefreshPending] = useState(false);
  const detailRetryRef = useRef<symbol | null>(null);
  const taskWritesRef = useRef(new Set<string>());
  const [pendingTasksByProject, setPendingTasksByProject] = useState(() => new Map<string, ReadonlySet<string>>());
  const [taskWriteErrorsByProject, setTaskWriteErrorsByProject] = useState(() => new Map<string, ReadonlyMap<string, string>>());
  const taskVerificationsRef = useRef(new Map<string, ReadonlySet<string>>());
  const [unverifiedTasksByProject, setUnverifiedTasksByProject] = useState(() => new Map<string, ReadonlySet<string>>());
  const projectVerificationsRef = useRef(new Map<string, symbol>());
  const [unverifiedProjectIds, setUnverifiedProjectIds] = useState<ReadonlySet<string>>(() => new Set());
  const projectVerificationReadsRef = useRef(new Set<string>());
  const [projectVerificationPendingIds, setProjectVerificationPendingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [projectVerificationErrors, setProjectVerificationErrors] = useState<ReadonlyMap<string, string>>(() => new Map());
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
  const projectFormOpeningRef = useRef<symbol | null>(null);
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
        setProjects(response.projects.map((project: Project) => {
          const changes = taskConfirmationsRef.current.get(project.id)?.changes;
          return changes?.size ? { ...project, taskItems: applyTaskConfirmations(project.taskItems, changes) } : project;
        }));
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

  const completeProjectVerification = useCallback((projectId: string, verification: symbol | undefined) => {
    if (!verification || projectVerificationsRef.current.get(projectId) !== verification) return;
    projectVerificationsRef.current.delete(projectId);
    setUnverifiedProjectIds(new Set(projectVerificationsRef.current.keys()));
    setProjectVerificationErrors(current => {
      const next = new Map(current);
      next.delete(projectId);
      return next;
    });
  }, []);

  const requireProjectReceipt = (projectId: string, details: ProjectDetailsResponse) => {
    try {
      assertProjectDetailsIdentity(projectId, details);
    } catch {
      // A 2xx response was received: do not turn uncertain acceptance into a
      // retryable refusal or apply another project's DTO to the page.
      projectVerificationsRef.current.set(projectId, Symbol('project receipt verification'));
      setUnverifiedProjectIds(new Set(projectVerificationsRef.current.keys()));
      ++pageRevisionRef.current;
      pageReadPendingRef.current = false;
      setPageLoading(false);
      const selection = detailSelectionRef.current;
      if (selection?.projectId === projectId) {
        ++selection.readRevision;
        detailRetryRef.current = null;
        setDetailRefreshPending(false);
        setDetailRefreshError(PROJECT_VERIFICATION_MESSAGE);
      }
      throw new ProjectReceiptVerificationRequiredError();
    }
  };

  const requireVerifiedProject = (projectId: string, permission: 'canEdit' | 'canClose' = 'canEdit') => {
    if (projectVerificationsRef.current.has(projectId)) throw new ProjectReceiptVerificationRequiredError();
    if (projects.find(project => project.id === projectId)?.permissions?.[permission] === false) {
      throw new Error('Cette opération sur le projet est non autorisée.');
    }
  };

  const applyConfirmedProject = (details: ProjectDetailsResponse, insert = false, taskRevision?: number): ConfirmedProject => {
    ++pageRevisionRef.current;
    const confirmations = taskConfirmationsRef.current.get(details.project.id);
    const changes = taskRevision === undefined ? new Map<string, ProjectTask | null>()
      : taskConfirmationsAfter(confirmations?.latest, taskRevision);
    const taskItems = applyTaskConfirmations(details.taskItems, changes);
    const confirmed = { ...mergeProjectDetails(details), taskItems };
    // Even a successful intervening GET may have cleared the pending overlay.
    // Keep newer tasks through this project's subsequent catalogue refresh;
    // only a new coherent detail GET reconciles this mixed-age presentation.
    if (confirmations && taskRevision !== undefined) {
      // This response is authoritative over tasks confirmed before its request.
      // Do not let their old pending overlays undo it in the next page GET.
      for (const [id, confirmation] of confirmations.latest) {
        if (confirmation.revision <= taskRevision) confirmations.changes.delete(id);
      }
      for (const [id, task] of changes) confirmations.changes.set(id, task);
    }
    setProjects((current) => current.some((project) => project.id === confirmed.id)
      ? current.map((project) => project.id === confirmed.id ? confirmed : project)
      : insert ? [...current, confirmed] : current);
    // Page totals, options and pagination still belong to the last successful page DTO.
    return { details: { project: confirmed, taskItems }, newerTasks: changes.size > 0 };
  };

  const beginDetailSelection = useCallback((projectId: string) => {
    const selection = { projectId, readRevision: 0 };
    detailSelectionRef.current = selection;
    setLinkedTaskId(null);
    detailRetryRef.current = null;
    setDetailRefreshError('');
    setDetailRefreshPending(false);
    return selection;
  }, []);

  const closeProjectDetails = useCallback(() => {
    detailSelectionRef.current = null;
    setSelectedProjectDetails(null);
    setLinkedTaskId(null);
    detailRetryRef.current = null;
    setDetailRefreshError('');
    setDetailRefreshPending(false);
  }, []);

  const updateSelectedProject = ({ details, newerTasks }: ConfirmedProject, selection: DetailSelection | null) => {
    if (!selection || detailSelectionRef.current !== selection || selection.projectId !== details.project.id) return;
    ++selection.readRevision;
    setSelectedProjectDetails(details);
    if (newerTasks) {
      setDetailRefreshError(current => current || 'Des tâches ont été confirmées pendant la modification du projet. Vérifiez la fiche pour actualiser les compteurs et la progression.');
    }
  };

  useEffect(() => () => {
    detailSelectionRef.current = null;
    projectFormOpeningRef.current = null;
  }, []);

  const completeTaskVerifications = useCallback((projectId: string) => {
    const ids = taskVerificationsRef.current.get(projectId);
    if (!ids) return;
    taskVerificationsRef.current.delete(projectId);
    setUnverifiedTasksByProject(new Map(taskVerificationsRef.current));
    setTaskWriteErrorsByProject(current => {
      const next = new Map(current);
      const errors = new Map(current.get(projectId));
      for (const id of ids) errors.delete(id);
      if (errors.size) next.set(projectId, errors);
      else next.delete(projectId);
      return next;
    });
  }, []);

  const readCurrentProjectDetails = useCallback(async (projectId: string, isCurrent: () => boolean) => {
    // A task confirmed during an opening requires a fresh GET, never a replay
    // of its write. Stop rereading as soon as this opening is superseded.
    while (isCurrent()) {
      const revision = taskConfirmationsRef.current.get(projectId)?.revision ?? 0;
      const verification = projectVerificationsRef.current.get(projectId);
      try {
        const details = await getProjectDetails(projectId);
        if (!isCurrent()) return null;
        if (projectVerificationsRef.current.get(projectId) !== verification) return null;
        if ((taskConfirmationsRef.current.get(projectId)?.revision ?? 0) !== revision) continue;
        assertProjectDetailsIdentity(projectId, details);
        const confirmations = taskConfirmationsRef.current.get(projectId);
        if (confirmations) {
          confirmations.latest = reconcileTaskConfirmations(confirmations.latest, details.taskItems);
          confirmations.changes.clear();
        }
        completeTaskVerifications(projectId);
        completeProjectVerification(projectId, verification);
        return details;
      } catch (error) {
        if (!isCurrent()) return null;
        if (projectVerificationsRef.current.get(projectId) !== verification) return null;
        // Existing session/permission decisions and navigation remain terminal;
        // do not repeat their side effects as task-read recovery.
        if (error instanceof BffProjectNavigationRequiredError ||
          (error instanceof BffProjectError && (error.status === 401 || error.status === 403))) throw error;
        if ((taskConfirmationsRef.current.get(projectId)?.revision ?? 0) !== revision) continue;
        throw error;
      }
    }
    return null;
  }, [completeTaskVerifications, completeProjectVerification]);

  useEffect(() => {
    const target = parseProjectDeepLink(window.location.search ?? '');
    if (!target) return;
    if ('error' in target) {
      setAlert({ type: 'error', message: target.error });
      return;
    }

    let active = true;
    const selection = beginDetailSelection(target.projectId);
    const revision = ++selection.readRevision;
    const isCurrent = () => active && detailSelectionRef.current === selection && selection.readRevision === revision;
    void readCurrentProjectDetails(target.projectId, isCurrent).then((details) => {
      if (!details || !isCurrent()) return;
      if (target.taskId && !details.taskItems.some((task: { id: string }) => task.id === target.taskId)) {
        setAlert({ type: 'error', message: 'La tâche demandée est introuvable dans ce projet.' });
        return;
      }
      setSelectedProjectDetails(details);
      setLinkedTaskId(target.taskId);
    }).catch((error) => {
      if (active && detailSelectionRef.current === selection && selection.readRevision === revision) {
        setAlert({ type: 'error', message: getBffProjectErrorMessage(error) });
      }
    });
    return () => { active = false; };
  }, [beginDetailSelection, readCurrentProjectDetails]);

  const refreshProjectDetails = async (projectId: string, selection: DetailSelection | null) => {
    const revision = selection && detailSelectionRef.current === selection && selection.projectId === projectId
      ? ++selection.readRevision : null;
    const taskRevision = taskConfirmationsRef.current.get(projectId)?.revision ?? 0;
    const verification = projectVerificationsRef.current.get(projectId);
    let details: ProjectDetailsResponse;
    try {
      details = await getProjectDetails(projectId);
      assertProjectDetailsIdentity(projectId, details);
    } catch (error) {
      if (projectVerificationsRef.current.get(projectId) !== verification) return null;
      if ((taskConfirmationsRef.current.get(projectId)?.revision ?? 0) !== taskRevision) return null;
      if (selection && detailSelectionRef.current === selection && selection.readRevision === revision) {
        setDetailRefreshError(getBffProjectErrorMessage(error));
      }
      throw error;
    }
    if (projectVerificationsRef.current.get(projectId) !== verification) return null;
    if ((taskConfirmationsRef.current.get(projectId)?.revision ?? 0) !== taskRevision) return null;
    const confirmations = taskConfirmationsRef.current.get(projectId);
    if (confirmations) {
      confirmations.latest = reconcileTaskConfirmations(confirmations.latest, details.taskItems);
      confirmations.changes.clear();
    }
    completeTaskVerifications(projectId);
    completeProjectVerification(projectId, verification);
    const projectWithTasks = mergeProjectDetails(details);

    setProjects((currentProjects) =>
      currentProjects.map((project) => (project.id === projectId ? { ...project, ...projectWithTasks } : project))
    );

    if (revision !== null && selection && detailSelectionRef.current === selection && selection.readRevision === revision) {
      setSelectedProjectDetails(details);
      setDetailRefreshError('');
    }

    return details;
  };

  const applyConfirmedTask = (projectId: string, taskId: string, task: ProjectTask | null, selection: DetailSelection | null) => {
    const previous = taskConfirmationsRef.current.get(projectId);
    const changes = new Map(previous?.changes);
    changes.set(taskId, task);
    const revision = (previous?.revision ?? 0) + 1;
    const latest = new Map(previous?.latest);
    latest.set(taskId, { revision, task });
    taskConfirmationsRef.current.set(projectId, { revision, changes, latest });
    ++pageRevisionRef.current;
    setProjects(current => current.map(project => project.id === projectId
      ? { ...project, taskItems: applyTaskConfirmations(project.taskItems, changes) } : project));
    if (selection && detailSelectionRef.current === selection && selection.projectId === projectId) {
      detailRetryRef.current = null;
      setDetailRefreshPending(false);
      setSelectedProjectDetails(current => {
        if (current?.project.id !== projectId) return current;
        const taskItems = applyTaskConfirmations(current.taskItems, changes);
        // Counts/progress/permissions are still the last received project DTO.
        return { ...current, taskItems, project: { ...current.project, taskItems } };
      });
    }
  };

  const retryProjectDetails = async () => {
    const selection = detailSelectionRef.current;
    if (!selection || detailRetryRef.current) return;
    if (projectVerificationsRef.current.has(selection.projectId)) return verifyProjectReceipt(selection.projectId);
    const request = Symbol('detail recovery');
    detailRetryRef.current = request;
    setDetailRefreshPending(true);
    try {
      const details = await refreshProjectDetails(selection.projectId, selection);
      if (details && detailSelectionRef.current === selection && detailRetryRef.current === request) {
        await refreshProjectsPage({ silent: true });
        if (detailSelectionRef.current === selection && detailRetryRef.current === request) {
          setAlert({ type: 'success', message: `Fiche "${details.project.title}" actualisée.` });
        }
      }
    } catch {
      // refreshProjectDetails exposes only the error owned by this selection.
    } finally {
      if (detailRetryRef.current === request) {
        detailRetryRef.current = null;
        setDetailRefreshPending(false);
      }
    }
  };

  const verifyProjectReceipt = async (projectId: string) => {
    const verification = projectVerificationsRef.current.get(projectId);
    if (!verification || projectVerificationReadsRef.current.has(projectId)) return;
    projectVerificationReadsRef.current.add(projectId);
    setProjectVerificationPendingIds(new Set(projectVerificationReadsRef.current));
    const selection = detailSelectionRef.current;
    try {
      const details = await refreshProjectDetails(projectId, selection);
      if (details && !projectVerificationsRef.current.has(projectId)) {
        showInfo(`Fiche "${details.project.title}" vérifiée par lecture. L’action n’a pas été répétée.`);
      }
    } catch (error) {
      if (projectVerificationsRef.current.get(projectId) === verification) {
        setProjectVerificationErrors(current => new Map(current).set(projectId, getBffProjectErrorMessage(error)));
      }
    } finally {
      projectVerificationReadsRef.current.delete(projectId);
      setProjectVerificationPendingIds(new Set(projectVerificationReadsRef.current));
    }
  };

  const openCreateProject = (status: Project['status'] = 'todo') => {
    if (projectFormPendingRef.current) return;
    projectFormOpeningRef.current = null;
    setProjectForm(createProjectFormState(status));
    setEditingProjectId(null);
    setProjectFormError('');
    setOpenFilter(null);
    setCreateProjectOpen(true);
  };

  const openProjectDetails = async (project: Project) => {
    setOpenFilter(null);
    const selection = beginDetailSelection(project.id);
    const revision = ++selection.readRevision;

    try {
      const details = await readCurrentProjectDetails(project.id, () => detailSelectionRef.current === selection && selection.readRevision === revision);
      if (details) setSelectedProjectDetails(details);
    } catch (error) {
      if (detailSelectionRef.current === selection && selection.readRevision === revision) showError(error);
    }
  };

  const openEditProject = async (project: Project) => {
    if (projectFormPendingRef.current || project.permissions?.canEdit === false) return;
    const opening = Symbol('project form opening');
    projectFormOpeningRef.current = opening;
    const verification = projectVerificationsRef.current.get(project.id);
    const isCurrent = () => projectFormOpeningRef.current === opening && !projectFormPendingRef.current &&
      projectVerificationsRef.current.get(project.id) === verification;
    setOpenFilter(null);
    let form = projectToFormState(project);
    let formError = '';
    let verifiedDetail = false;
    const denyEdit = (error: unknown) => {
      // A newly denied current project cannot keep its older editor available.
      if (editingProjectId === project.id) {
        setCreateProjectOpen(false);
        setEditingProjectId(null);
      }
      showError(error);
    };

    try {
      const details = await getProjectDetails(project.id);
      if (!isCurrent()) return;
      try {
        assertProjectDetailsIdentity(project.id, details);
      } catch (error) {
        showError(error);
        return;
      }
      if (details.project.permissions?.canEdit === false) {
        denyEdit(new Error('La modification de ce projet est non autorisée.'));
        return;
      }
      form = projectToFormState(mergeProjectDetails(details));
      verifiedDetail = true;
    } catch (error) {
      if (!isCurrent() || isAbortError(error)) return;
      if (error instanceof BffProjectNavigationRequiredError ||
          (error instanceof BffProjectError && (error.status === 401 || error.status === 403))) {
        denyEdit(error);
        return;
      }
      // Retain the existing displayed-record fallback, but disclose that its
      // newer detail could not be read. Never use a foreign/denied detail.
      formError = `Les données récentes n’ont pas pu être chargées : ${getBffProjectErrorMessage(error)}. Le formulaire reprend le projet déjà affiché.`;
      showError(error);
    }

    if (!isCurrent()) return;
    // Commit target and fields together; a waiting replacement must not
    // silently retarget a currently displayed draft before its data arrives.
    projectFormOpeningRef.current = null;
    setEditingProjectId(project.id);
    setProjectForm(form);
    setProjectFormError(formError);
    setCreateProjectOpen(true);
    if (verifiedDetail) completeProjectVerification(project.id, verification);
  };

  const closeCreateProject = () => {
    if (projectFormPendingRef.current) return;
    projectFormOpeningRef.current = null;
    setCreateProjectOpen(false);
    setEditingProjectId(null);
    setProjectFormError('');
  };

  const updateProjectForm = (patch: Partial<ProjectFormState>) => {
    if (projectFormPendingRef.current) return;
    projectFormOpeningRef.current = null;
    setProjectForm((current) => ({ ...current, ...patch }));
    if (projectFormError) setProjectFormError('');
  };

  const keepProjectFormCurrent = () => {
    if (!projectFormPendingRef.current) projectFormOpeningRef.current = null;
  };

  const updateProjectFromForm = async (projectId: string, form: ProjectFormState) => {
    requireVerifiedProject(projectId);
    const selection = detailSelectionRef.current;
    const taskRevision = taskConfirmationsRef.current.get(projectId)?.revision ?? 0;
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
    requireProjectReceipt(projectId, details);
    const confirmed = applyConfirmedProject(details, false, taskRevision);
    updateSelectedProject(confirmed, selection);
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

    const selection = detailSelectionRef.current;
    const taskRevision = taskConfirmationsRef.current.get(project.id)?.revision ?? 0;
    try {
      requireVerifiedProject(project.id);
      const details = await updateProject(project.id, { status });
      requireProjectReceipt(project.id, details);
      const confirmed = applyConfirmedProject(details, false, taskRevision);
      updateSelectedProject(confirmed, selection);
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
    projectFormOpeningRef.current = null;

    if (!validateProjectForm(projectForm)) {
      setProjectFormError('Les champs obligatoires doivent être renseignés.');
      return;
    }

    projectFormPendingRef.current = true;
    const selection = detailSelectionRef.current;
    const taskRevision = editingProjectId ? taskConfirmationsRef.current.get(editingProjectId)?.revision ?? 0 : undefined;
    setProjectFormPending(true);
    setProjectFormError('');
    try {
      if (editingProjectId) requireVerifiedProject(editingProjectId);
      const details = editingProjectId
        ? await updateProject(editingProjectId, updateProjectBodyFromForm(projectForm))
        : await createProject(createProjectBodyFromForm(projectForm));
      if (editingProjectId) requireProjectReceipt(editingProjectId, details);
      const confirmed = applyConfirmedProject(details, !editingProjectId, taskRevision);

      // Only the confirmed write discards the draft. A later read failure is not a refusal.
      setCreateProjectOpen(false);
      setEditingProjectId(null);
      setProjectForm(createProjectFormState());
      if (editingProjectId) {
        updateSelectedProject(confirmed, selection);
      } else {
        resetProjectFilters();
        beginDetailSelection(details.project.id);
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
      if (!(error instanceof ProjectReceiptVerificationRequiredError)) setProjectFormError(getBffProjectErrorMessage(error));
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
      if (detailSelectionRef.current?.projectId === project.id) closeProjectDetails();
      if (editingProjectId === project.id) closeCreateProject();
      await refreshProjectsPage({ silent: true });
      setAlert({ type: 'success', message: `Projet "${project.title}" supprimé.` });
    } catch (error) {
      showError(error);
    }
  };

  const addProjectTask = async (project: Project, taskDraft: ProjectTaskDraft) => {
    const selection = detailSelectionRef.current;
    const title = taskDraft.title.trim();
    if (!title) return;

    let confirmed: ProjectTask;
    try {
      confirmed = await createProjectTask(project.id, taskBodyFromDraft(taskDraft));
    } catch (error) {
      showError(error);
      throw error;
    }
    applyConfirmedTask(project.id, confirmed.id, confirmed, selection);
    // The write is confirmed. A failed refresh must not offer the same POST again.
    try {
      if (!await refreshProjectDetails(project.id, selection)) return;
      await refreshProjectsPage({ silent: true });
      setAlert({ type: 'success', message: `Tâche "${confirmed.title}" ajoutée à "${project.title}".` });
    } catch (error) {
      showInfo(`Tâche "${confirmed.title}" enregistrée. Actualisation impossible : ${getBffProjectErrorMessage(error)}`);
    }
  };

  const setTaskWriteError = (projectId: string, taskId: string, message?: string) => {
    setTaskWriteErrorsByProject(current => {
      const next = new Map(current);
      const errors = new Map(current.get(projectId));
      if (message) errors.set(taskId, message);
      else errors.delete(taskId);
      if (errors.size) next.set(projectId, errors);
      else next.delete(projectId);
      return next;
    });
  };

  const showTaskWriteError = (projectId: string, taskId: string, error: unknown) => {
    setTaskWriteError(projectId, taskId, getBffProjectErrorMessage(error));
    showError(error);
  };

  const runTaskWrite = async (projectId: string, taskId: string, write: () => Promise<void>, rejectIfPending = false) => {
    if (taskVerificationsRef.current.get(projectId)?.has(taskId)) {
      if (rejectIfPending) throw new ProjectTaskVerificationRequiredError();
      return;
    }
    // Tuple encoding avoids collisions between arbitrary project/task IDs.
    const key = JSON.stringify([projectId, taskId]);
    if (taskWritesRef.current.has(key)) {
      // An edit form must retain its draft, not interpret a skipped write as a
      // confirmation and clear itself. Row status/delete repeats are ignored.
      if (rejectIfPending) throw new Error('Une opération est déjà en cours pour cette tâche. Réessayez après sa confirmation.');
      return;
    }
    taskWritesRef.current.add(key);
    setTaskWriteError(projectId, taskId);
    setPendingTasksByProject(current => {
      const next = new Map(current);
      next.set(projectId, new Set(current.get(projectId)).add(taskId));
      return next;
    });
    try {
      await write();
    } finally {
      taskWritesRef.current.delete(key);
      setPendingTasksByProject(current => {
        const next = new Map(current);
        const tasks = new Set(current.get(projectId));
        tasks.delete(taskId);
        if (tasks.size) next.set(projectId, tasks);
        else next.delete(projectId);
        return next;
      });
    }
  };

  const verifyInconsistentTaskReceipt = async (projectId: string, taskId: string, selection: DetailSelection | null) => {
    taskVerificationsRef.current.set(projectId, new Set(taskVerificationsRef.current.get(projectId)).add(taskId));
    setUnverifiedTasksByProject(new Map(taskVerificationsRef.current));
    // A read started before this uncertain confirmation cannot unlock it.
    const previous = taskConfirmationsRef.current.get(projectId);
    taskConfirmationsRef.current.set(projectId, { revision: (previous?.revision ?? 0) + 1, changes: new Map(previous?.changes), latest: new Map(previous?.latest) });
    ++pageRevisionRef.current;
    setTaskWriteError(projectId, taskId, TASK_VERIFICATION_MESSAGE);
    showInfo(TASK_VERIFICATION_MESSAGE);
    try {
      const details = await refreshProjectDetails(projectId, selection);
      if (!details) return false;
      showInfo('La fiche a été vérifiée par lecture. Consultez les données reçues avant toute nouvelle action.');
      await refreshProjectsPage({ silent: true });
      return true;
    } catch {
      // The accepted write is never replayed. Only a coherent detail GET may
      // release this target; uncertainty stays distinct from write refusal.
      return false;
    }
  };

  const updateProjectTask = async (projectId: string, taskId: string, taskDraft: ProjectTaskDraft) => {
    const selection = detailSelectionRef.current;
    const title = taskDraft.title.trim();
    if (!title) return;

    return runTaskWrite(projectId, taskId, async () => {
      let confirmed: ProjectTask;
      try {
        confirmed = await updateBffProjectTask(projectId, taskId, taskBodyFromDraft(taskDraft));
      } catch (error) {
        showTaskWriteError(projectId, taskId, error);
        throw error;
      }
      if (confirmed.id !== taskId) {
        if (!await verifyInconsistentTaskReceipt(projectId, taskId, selection)) throw new ProjectTaskVerificationRequiredError();
        return;
      }
      applyConfirmedTask(projectId, confirmed.id, confirmed, selection);
      try {
        if (!await refreshProjectDetails(projectId, selection)) return;
        await refreshProjectsPage({ silent: true });
        setAlert({ type: 'success', message: `Tâche "${confirmed.title}" modifiée.` });
      } catch (error) {
        showInfo(`Tâche "${confirmed.title}" enregistrée. Actualisation impossible : ${getBffProjectErrorMessage(error)}`);
      }
    }, true);
  };

  const changeProjectTaskStatus = async (
    projectId: string,
    taskId: string,
    status: ProjectStatus
  ) => {
    const selection = detailSelectionRef.current;
    return runTaskWrite(projectId, taskId, async () => {
      let updatedTask: ProjectTask;
      try {
        updatedTask = await updateProjectTaskStatus(projectId, taskId, status);
      } catch (error) {
        showTaskWriteError(projectId, taskId, error);
        return;
      }
      if (updatedTask.id !== taskId) {
        await verifyInconsistentTaskReceipt(projectId, taskId, selection);
        return;
      }
      applyConfirmedTask(projectId, updatedTask.id, updatedTask, selection);
      try {
        if (!await refreshProjectDetails(projectId, selection)) return;
        await refreshProjectsPage({ silent: true });
        setAlert({
          type: 'success',
          message: `Statut de la tâche "${updatedTask.title}" mis à jour : ${updatedTask.statusLabel ?? status}.`,
        });
      } catch (error) {
        showInfo(`Tâche "${updatedTask.title}" enregistrée. Actualisation impossible : ${getBffProjectErrorMessage(error)}`);
      }
    });
  };

  const deleteProjectTask = async (projectId: string, taskId: string, taskTitle: string) => {
    const selection = detailSelectionRef.current;
    return runTaskWrite(projectId, taskId, async () => {
      try {
        await deleteBffProjectTask(projectId, taskId);
      } catch (error) {
        showTaskWriteError(projectId, taskId, error);
        return;
      }
      applyConfirmedTask(projectId, taskId, null, selection);
      try {
        if (!await refreshProjectDetails(projectId, selection)) return;
        await refreshProjectsPage({ silent: true });
        setAlert({ type: 'success', message: `Tâche "${taskTitle}" supprimée.` });
      } catch (error) {
        showInfo(`Tâche "${taskTitle}" supprimée. Actualisation impossible : ${getBffProjectErrorMessage(error)}`);
      }
    });
  };

  const closeProject = async (projectId: string, status: 'done' | 'review') => {
    const selection = detailSelectionRef.current;
    const taskRevision = taskConfirmationsRef.current.get(projectId)?.revision ?? 0;
    try {
      requireVerifiedProject(projectId, 'canClose');
      const details = await closeBffProject(projectId, status);
      requireProjectReceipt(projectId, details);
      const confirmed = applyConfirmedProject(details, false, taskRevision);
      updateSelectedProject(confirmed, selection);
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
  const pendingTaskIds = pendingTasksByProject.get(selectedProject?.id ?? '') ?? new Set<string>();
  const taskWriteErrors = taskWriteErrorsByProject.get(selectedProject?.id ?? '') ?? new Map<string, string>();
  const unverifiedTaskIds = unverifiedTasksByProject.get(selectedProject?.id ?? '') ?? new Set<string>();
  const canCreateProject =
    projectsPage?.access?.canCreateProject ?? false;
  const pageTitle = projectsPage?.page.title ?? 'Projets';
  const pageSubtitle = projectsPage?.page.subtitle ?? '';
  const frontHrefs = getActiveFrontHrefs();

  return {
    projectsPage,
    projects,
    closeProjectDetails,
    detailRefreshError,
    detailRefreshPending,
    pendingTaskIds,
    taskWriteErrors,
    unverifiedTaskIds,
    unverifiedProjectIds,
    projectVerificationPendingIds,
    projectVerificationErrors,
    verifyProjectReceipt,
    retryProjectDetails,
    linkedTaskId,
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
  };
}

export type ProjectsController = ReturnType<typeof useProjectsController>;
