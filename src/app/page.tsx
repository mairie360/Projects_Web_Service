'use client';

import React, { useMemo, useState } from 'react';
import { Alert, Button, Footer, Header, Sidebar, ToolTip } from '@mairie360/lib-components';
import {
  Check,
  ChevronDown,
  Grid3X3,
  Kanban,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { KanbanBoard } from '../components/Kanban';
import {
  formatProjectDate,
  PersonAvatar,
  PriorityPill,
  ProgressMeter,
  ProjectCard,
  StatusPill,
} from '../components/ProjectCard';
import { mockProjects, type Project } from '../types/project';

type ViewMode = 'kanban' | 'grid' | 'table';

type FilterOption = {
  label: string;
  value: string;
};

const statusOptions: FilterOption[] = [
  { label: 'Tous les statuts', value: 'all' },
  { label: 'À faire', value: 'todo' },
  { label: 'En cours', value: 'in-progress' },
  { label: 'En révision', value: 'review' },
  { label: 'Terminé', value: 'done' },
];

const priorityOptions: FilterOption[] = [
  { label: 'Toutes les priorités', value: 'all' },
  { label: 'Haute', value: 'high' },
  { label: 'Moyenne', value: 'medium' },
  { label: 'Basse', value: 'low' },
];

const viewOptions: { value: ViewMode; label: string; icon: LucideIcon }[] = [
  { value: 'kanban', label: 'Kanban', icon: Kanban },
  { value: 'grid', label: 'Grille', icon: Grid3X3 },
  { value: 'table', label: 'Table', icon: List },
];

function ActionButton({
  label,
  icon: Icon,
  primary = false,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <span className="relative inline-flex">
      <Icon
        className={`pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 ${
          primary ? 'text-white' : 'text-[#2f3438]'
        }`}
        strokeWidth={2}
      />
      <Button
        label={label}
        primary={primary ? true : undefined}
        onClick={onClick}
        className={`!h-10 !min-h-0 !rounded-md !pl-10 !pr-4 !text-sm !font-semibold ${
          primary
            ? '!border-[#1256a6] !bg-[#1256a6] !text-white hover:!bg-[#0f4b92]'
            : '!border-[#d9d5d0] !bg-white !text-[#2f3438] hover:!border-[#b9d6d5] hover:!bg-[#fafafa]'
        }`}
      />
    </span>
  );
}

function FilterSelect({
  label,
  value,
  options,
  open,
  widthClassName = 'sm:w-40',
  onOpenChange,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  open: boolean;
  widthClassName?: string;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className={`relative w-full ${widthClassName}`}>
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between rounded-md border border-[#d0ccc7] bg-white px-3 text-left text-sm text-[#2f3438] shadow-sm transition hover:border-[#b9d6d5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4b908d]/25"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#8a8f94]" strokeWidth={1.8} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-30 w-full overflow-hidden rounded-md border border-[#d9d5d0] bg-white py-1 shadow-[0_8px_20px_rgba(28,31,35,0.15)]"
          role="listbox"
          aria-label={label}
        >
          {options.map((option) => {
            const isActive = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`flex h-9 w-full items-center justify-between px-3 text-left text-sm transition ${
                  isActive ? 'bg-[#d4eeee] text-[#2b706c]' : 'text-[#2f3438] hover:bg-[#f4f1ee]'
                }`}
                onClick={() => {
                  onChange(option.value);
                  onOpenChange(false);
                }}
              >
                <span>{option.label}</span>
                {isActive && <Check className="h-4 w-4" strokeWidth={1.9} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (value: ViewMode) => void }) {
  return (
    <div className="inline-flex h-10 rounded-lg bg-[#ebe9e6] p-1" role="tablist" aria-label="Vue des projets">
      {viewOptions.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`inline-flex min-w-[82px] items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
              active ? 'bg-white text-[#172033] shadow-sm' : 'text-[#3f4750] hover:bg-white/70'
            }`}
            onClick={() => onChange(option.value)}
          >
            <Icon className="h-4 w-4" strokeWidth={1.8} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative w-full max-w-[448px]">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b97a6]" />
      <input
        type="search"
        value={value}
        placeholder="Rechercher des projets..."
        className="h-10 w-full rounded-md border border-[#d0ccc7] bg-white py-2 pl-11 pr-4 text-sm text-[#172033] shadow-sm outline-none transition placeholder:text-[#66768a] focus:border-[#4b908d] focus:ring-2 focus:ring-[#4b908d]/15"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-[#d0ccc7] bg-white px-6 py-12 text-center text-sm text-[#66717c]">
      Aucun projet ne correspond aux filtres sélectionnés.
    </div>
  );
}

function GridView({
  projects,
  onProjectOpen,
  onProjectEdit,
}: {
  projects: Project[];
  onProjectOpen: (project: Project) => void;
  onProjectEdit: (project: Project) => void;
}) {
  if (projects.length === 0) return <EmptyState />;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          variant="grid"
          onOpen={onProjectOpen}
          onEdit={onProjectEdit}
        />
      ))}
    </div>
  );
}

function TableView({
  projects,
  onProjectOpen,
  onProjectEdit,
}: {
  projects: Project[];
  onProjectOpen: (project: Project) => void;
  onProjectEdit: (project: Project) => void;
}) {
  if (projects.length === 0) return <EmptyState />;

  return (
    <div className="overflow-hidden rounded-lg border border-[#d9d5d0] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1060px] text-left">
          <thead className="border-b border-[#d9d5d0] bg-[#fbfaf8] text-base font-semibold text-[#2f3438]">
            <tr>
              <th className="px-5 py-4">Projet</th>
              <th className="px-5 py-4">Statut</th>
              <th className="px-5 py-4">Responsable</th>
              <th className="px-5 py-4">Priorité</th>
              <th className="px-5 py-4">Progression</th>
              <th className="px-5 py-4">Échéance</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e4e1dc]">
            {projects.map((project) => (
              <tr
                key={project.id}
                className="cursor-pointer transition hover:bg-[#f8f6f3]"
                onClick={() => onProjectOpen(project)}
              >
                <td className="max-w-[360px] px-5 py-4">
                  <div className="truncate text-base font-semibold text-[#172033]">{project.title}</div>
                  <div className="truncate text-sm text-[#5e6873]">{project.description}</div>
                </td>
                <td className="px-5 py-4">
                  <StatusPill status={project.status} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 text-sm text-[#2f3438]">
                    <PersonAvatar name={project.responsible.name} />
                    <span>{project.responsible.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <PriorityPill priority={project.priority} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex w-36 items-center gap-3">
                    <div className="w-20">
                      <ProgressMeter value={project.progress} showLabel={false} compact />
                    </div>
                    <span className="text-sm font-semibold text-[#2f3438]">{project.progress}%</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-[#5e6873]">{formatProjectDate(project.dueDate)}</td>
                <td className="px-5 py-4">
                  <ToolTip text="Actions">
                    <button
                      type="button"
                      aria-label={`Actions pour ${project.title}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#2f3438] transition hover:bg-[#ece9e4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4b908d]/30"
                      onClick={(event) => {
                        event.stopPropagation();
                        onProjectEdit(project);
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" strokeWidth={2.2} />
                    </button>
                  </ToolTip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects] = useState<Project[]>(mockProjects);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openFilter, setOpenFilter] = useState<'status' | 'priority' | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

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

  const showProject = (project: Project) => {
    showInfo(`Projet : ${project.title}`);
  };

  const addProject = (status?: Project['status']) => {
    const suffix = status ? ` dans "${statusOptions.find((option) => option.value === status)?.label}"` : '';
    setAlert({ type: 'success', message: `Nouveau projet${suffix}.` });
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f6f4f1] text-[#172033]">
      <div className="flex h-full">
        <div className="hidden shrink-0 lg:block">
          <Sidebar activeItem="projects" isAdmin brandLabel="Mairie360" brandInitial="M" />
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
                brandLabel="Mairie360"
                brandInitial="M"
                onItemSelect={() => setSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            user={{ name: 'Admin Système', email: 'admin@mairie360.fr', role: 'admin' }}
            isAdmin
            setSidebarOpen={setSidebarOpen}
            onPageChange={(page) => showInfo(`Navigation : ${page}`)}
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
                    <ActionButton label="Nouveau projet" icon={Plus} primary onClick={() => addProject()} />
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
                    onProjectOpen={showProject}
                    onProjectEdit={(project) => showInfo(`Actions : ${project.title}`)}
                    onAddProject={addProject}
                  />
                )}

                {viewMode === 'grid' && (
                  <GridView
                    projects={filteredProjects}
                    onProjectOpen={showProject}
                    onProjectEdit={(project) => showInfo(`Actions : ${project.title}`)}
                  />
                )}

                {viewMode === 'table' && (
                  <TableView
                    projects={filteredProjects}
                    onProjectOpen={showProject}
                    onProjectEdit={(project) => showInfo(`Actions : ${project.title}`)}
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
