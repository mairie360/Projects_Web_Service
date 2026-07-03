'use client';

import React, { useMemo, useState } from 'react';
import { Alert, Footer, Header, Sidebar } from '@mairie360/lib-components';
import { Plus, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { KanbanBoard } from '../components/Kanban';
import { ActionButton } from '../components/project/ProjectFormControls';
import { CreateProjectModal, ProjectDetailModal } from '../components/project/ProjectModals';
import { FilterSelect, GridView, SearchInput, TableView, ViewToggle } from '../components/project/ProjectViews';
import { appSidebarItems, currentUser, getNavigationHref } from '../lib/appShell';
import {
  calculateProjectProgress,
  createInitialTaskItems,
  createProjectFormState,
  createSelectOptions,
  defaultProjectLabels,
  defaultProjectMembers,
  formatInputDate,
  getUniqueValues,
  priorityOptions,
  projectToFormState,
  statusOptions,
  type ProjectFormState,
  type ViewMode,
} from '../lib/projectPageState';
import { mockProjects, type Project, type ProjectTask, type ProjectTaskDraft } from '../types/project';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openFilter, setOpenFilter] = useState<'status' | 'priority' | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(() => createProjectFormState());
  const [projectFormError, setProjectFormError] = useState('');

  const memberOptions = useMemo(
    () =>
      createSelectOptions([
        ...defaultProjectMembers,
        ...projects.flatMap((project) => [
          project.responsible.name,
          ...project.assignees.map((assignee) => assignee.name),
        ]),
      ]),
    [projects]
  );

  const labelOptions = useMemo(
    () => createSelectOptions([...defaultProjectLabels, ...projects.flatMap((project) => project.labels)]),
    [projects]
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
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

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [priorityFilter, projects, searchTerm, statusFilter]);

  const showInfo = (message: string) => {
    setAlert({ type: 'info', message });
  };

  const handlePageChange = (page: string) => {
    const href = getNavigationHref(page);

    if (href) {
      router.push(href);
      return;
    }

    showInfo(`Navigation : ${page}`);
  };

  const handleSidebarItemSelect = (item: { id: string; label: string }) => {
    const href = getNavigationHref(item.id);

    if (href) {
      router.push(href);
    } else {
      showInfo(`Navigation : ${item.label}`);
    }

    setSidebarOpen(false);
  };

  const openCreateProject = (status: Project['status'] = 'todo') => {
    setProjectForm(createProjectFormState(status));
    setEditingProjectId(null);
    setProjectFormError('');
    setOpenFilter(null);
    setCreateProjectOpen(true);
  };

  const openEditProject = (project: Project) => {
    setProjectForm(projectToFormState(project));
    setEditingProjectId(project.id);
    setProjectFormError('');
    setOpenFilter(null);
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

  const updateProjectFromForm = (projectId: string, form: ProjectFormState) => {
    const title = form.title.trim();
    const description = form.description.trim();
    const responsibleName = form.responsible.trim();
    const dueDate = form.dueDate;

    if (!title || !description || !responsibleName || !dueDate) return;

    const assigneeNames = getUniqueValues([responsibleName, ...form.assignees]);

    setProjects((currentProjects) =>
      currentProjects.map((project) => {
        if (project.id !== projectId) return project;

        return {
          ...project,
          title,
          description,
          status: form.status,
          responsible: { name: responsibleName },
          assignees: assigneeNames.map((name) => ({ name })),
          dueDate,
          priority: form.priority,
          labels: getUniqueValues(form.labels),
        };
      })
    );

    setAlert({ type: 'success', message: `Projet "${title}" modifié.` });
  };

  const saveProject = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = projectForm.title.trim();
    const description = projectForm.description.trim();
    const responsibleName = projectForm.responsible.trim();
    const dueDate = projectForm.dueDate;

    if (!title || !description || !responsibleName || !dueDate) {
      setProjectFormError('Les champs obligatoires doivent être renseignés.');
      return;
    }

    const taskItems = projectForm.taskItems.map((task) => ({
      ...task,
      responsible: { ...task.responsible },
      assignees: task.assignees.map((assignee) => ({ ...assignee })),
      labels: [...task.labels],
    }));
    const totalTasks = taskItems.length;
    const completedTasks = taskItems.filter((task) => task.completed).length;
    const progress = calculateProjectProgress(taskItems);
    const assigneeNames = getUniqueValues([responsibleName, ...projectForm.assignees]);

    const projectFields = {
      title,
      description,
      status: projectForm.status,
      responsible: { name: responsibleName },
      assignees: assigneeNames.map((name) => ({ name })),
      progress,
      dueDate,
      priority: projectForm.priority,
      labels: getUniqueValues(projectForm.labels),
      taskItems,
      tasks: {
        total: totalTasks,
        completed: completedTasks,
      },
    };

    if (editingProjectId) {
      setProjects((currentProjects) =>
        currentProjects.map((project) => (project.id === editingProjectId ? { ...project, ...projectFields } : project))
      );
      setCreateProjectOpen(false);
      setEditingProjectId(null);
      setAlert({ type: 'success', message: `Projet "${title}" modifié.` });
      return;
    }

    const newProject: Project = {
      id: `project-${Date.now()}`,
      ...projectFields,
      createdAt: formatInputDate(new Date()),
    };

    setProjects((currentProjects) => [newProject, ...currentProjects]);
    setSelectedProjectId(newProject.id);
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCreateProjectOpen(false);
    setAlert({ type: 'success', message: `Projet "${newProject.title}" créé.` });
  };

  const duplicateProject = (project: Project) => {
    const duplicatedProject: Project = {
      ...project,
      id: `project-${Date.now()}`,
      title: `${project.title} (copie)`,
      responsible: { ...project.responsible },
      assignees: project.assignees.map((assignee) => ({ ...assignee })),
      labels: [...project.labels],
      taskItems: project.taskItems?.map((task, index) => ({
        ...task,
        id: `task-${Date.now()}-${index}`,
        responsible: { ...task.responsible },
        assignees: task.assignees.map((assignee) => ({ ...assignee })),
        labels: [...task.labels],
      })),
      tasks: { ...project.tasks },
      createdAt: formatInputDate(new Date()),
    };

    setProjects((currentProjects) => [duplicatedProject, ...currentProjects]);
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setAlert({ type: 'success', message: `Projet "${duplicatedProject.title}" dupliqué.` });
  };

  const deleteProject = (project: Project) => {
    const confirmed = window.confirm(`Supprimer le projet "${project.title}" ?`);
    if (!confirmed) return;

    setProjects((currentProjects) => currentProjects.filter((currentProject) => currentProject.id !== project.id));
    if (selectedProjectId === project.id) setSelectedProjectId(null);
    if (editingProjectId === project.id) closeCreateProject();
    setAlert({ type: 'success', message: `Projet "${project.title}" supprimé.` });
  };

  const addProjectTask = (project: Project, taskDraft: ProjectTaskDraft) => {
    const title = taskDraft.title.trim();
    if (!title) return;

    const task: ProjectTask = {
      ...taskDraft,
      responsible: { ...taskDraft.responsible },
      assignees: taskDraft.assignees.map((assignee) => ({ ...assignee })),
      labels: [...taskDraft.labels],
      title,
      id: `task-${Date.now()}`,
      completed: taskDraft.status === 'done',
      createdAt: formatInputDate(new Date()),
    };

    setProjects((currentProjects) =>
      currentProjects.map((currentProject) => {
        if (currentProject.id !== project.id) return currentProject;

        const taskItems = [...createInitialTaskItems(currentProject), task];
        const completedTasks = taskItems.filter((projectTask) => projectTask.completed).length;
        const totalTasks = taskItems.length;
        const progress = calculateProjectProgress(taskItems);

        return {
          ...currentProject,
          taskItems,
          tasks: {
            total: totalTasks,
            completed: completedTasks,
          },
          progress,
        };
      })
    );

    setAlert({ type: 'success', message: `Tâche "${title}" ajoutée à "${project.title}".` });
  };

  const updateProjectTask = (projectId: string, taskId: string, taskDraft: ProjectTaskDraft) => {
    const title = taskDraft.title.trim();
    if (!title) return;

    setProjects((currentProjects) =>
      currentProjects.map((project) => {
        if (project.id !== projectId) return project;

        const taskItems = createInitialTaskItems(project).map((task) => {
          if (task.id !== taskId) return task;

          return {
            ...task,
            ...taskDraft,
            title,
            responsible: { ...taskDraft.responsible },
            assignees: taskDraft.assignees.map((assignee) => ({ ...assignee })),
            labels: [...taskDraft.labels],
            completed: taskDraft.status === 'done',
          };
        });
        const completedTasks = taskItems.filter((task) => task.completed).length;

        return {
          ...project,
          taskItems,
          progress: calculateProjectProgress(taskItems),
          tasks: {
            total: taskItems.length,
            completed: completedTasks,
          },
        };
      })
    );

    setAlert({ type: 'success', message: `Tâche "${title}" modifiée.` });
  };

  const toggleProjectTask = (projectId: string, taskId: string) => {
    setProjects((currentProjects) =>
      currentProjects.map((project) => {
        if (project.id !== projectId) return project;

        const taskItems = createInitialTaskItems(project).map((task) => {
          if (task.id !== taskId) return task;

          const completed = !task.completed;

          return {
            ...task,
            completed,
            status: (completed ? 'done' : 'todo') as Project['status'],
          };
        });
        const completedTasks = taskItems.filter((task) => task.completed).length;

        return {
          ...project,
          taskItems,
          progress: calculateProjectProgress(taskItems),
          tasks: {
            total: taskItems.length,
            completed: completedTasks,
          },
        };
      })
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f6f4f1] text-[#172033]">
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          tasks={createInitialTaskItems(selectedProject)}
          memberOptions={memberOptions}
          labelOptions={labelOptions}
          onClose={() => setSelectedProjectId(null)}
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
            isAdmin
            items={appSidebarItems}
            brandLabel="Mairie360"
            brandInitial="M"
            onItemSelect={handleSidebarItemSelect}
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
                isAdmin
                items={appSidebarItems}
                brandLabel="Mairie360"
                brandInitial="M"
                onItemSelect={handleSidebarItemSelect}
              />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            user={currentUser}
            isAdmin
            setSidebarOpen={setSidebarOpen}
            profileHref="/profile"
            onPageChange={handlePageChange}
            onLogout={() => showInfo('Déconnexion en attente.')}
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
                    <h1 className="text-2xl font-bold leading-tight text-[#172033]">Projets</h1>
                    <p className="mt-2 text-sm text-[#536171]">
                      Gérez vos projets municipaux avec des vues Kanban, tableau et grille
                    </p>
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
                        options={statusOptions}
                        open={openFilter === 'status'}
                        onOpenChange={(open) => setOpenFilter(open ? 'status' : null)}
                        onChange={setStatusFilter}
                      />
                      <FilterSelect
                        label="Filtrer par priorité"
                        value={priorityFilter}
                        options={priorityOptions}
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
                {viewMode === 'kanban' && (
                  <KanbanBoard
                    projects={filteredProjects}
                    memberOptions={memberOptions}
                    labelOptions={labelOptions}
                    onProjectOpen={openEditProject}
                    onProjectEdit={openEditProject}
                    onProjectDuplicate={duplicateProject}
                    onProjectDelete={deleteProject}
                    onProjectTaskAdd={addProjectTask}
                    onAddProject={openCreateProject}
                  />
                )}

                {viewMode === 'grid' && (
                  <GridView
                    projects={filteredProjects}
                    memberOptions={memberOptions}
                    labelOptions={labelOptions}
                    onProjectOpen={openEditProject}
                    onProjectEdit={openEditProject}
                    onProjectDuplicate={duplicateProject}
                    onProjectDelete={deleteProject}
                    onProjectTaskAdd={addProjectTask}
                  />
                )}

                {viewMode === 'table' && (
                  <TableView
                    projects={filteredProjects}
                    onProjectOpen={openEditProject}
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
