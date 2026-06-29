'use client';

import { Check, ChevronDown, Search } from 'lucide-react';

import {
  formatProjectDate,
  PersonAvatar,
  PriorityPill,
  ProgressMeter,
  ProjectActionsMenu,
  ProjectCard,
  StatusPill,
} from '../ProjectCard';
import type { Project, ProjectTaskDraft } from '../../types/project';
import { viewOptions, type FilterOption, type ViewMode } from '../../lib/projectPageState';

export function FilterSelect({
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

export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (value: ViewMode) => void }) {
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

export function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
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

export function GridView({
  projects,
  memberOptions,
  labelOptions,
  onProjectOpen,
  onProjectEdit,
  onProjectDuplicate,
  onProjectDelete,
  onProjectTaskAdd,
}: {
  projects: Project[];
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  onProjectOpen: (project: Project) => void;
  onProjectEdit: (project: Project) => void;
  onProjectDuplicate: (project: Project) => void;
  onProjectDelete: (project: Project) => void;
  onProjectTaskAdd: (project: Project, task: ProjectTaskDraft) => void;
}) {
  if (projects.length === 0) return <EmptyState />;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          variant="grid"
          memberOptions={memberOptions}
          labelOptions={labelOptions}
          onOpen={onProjectOpen}
          onEdit={onProjectEdit}
          onDuplicate={onProjectDuplicate}
          onDelete={onProjectDelete}
          onAddTask={onProjectTaskAdd}
        />
      ))}
    </div>
  );
}

export function TableView({
  projects,
  onProjectOpen,
  onProjectEdit,
  onProjectDuplicate,
  onProjectDelete,
}: {
  projects: Project[];
  onProjectOpen: (project: Project) => void;
  onProjectEdit: (project: Project) => void;
  onProjectDuplicate: (project: Project) => void;
  onProjectDelete: (project: Project) => void;
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
                  <ProjectActionsMenu
                    project={project}
                    onEdit={onProjectEdit}
                    onDuplicate={onProjectDuplicate}
                    onDelete={onProjectDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
