'use client';

import React from 'react';
import { ToolTip } from '@mairie360/lib-components';
import { AlertCircle, CheckCircle2, Clock3, Eye, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { ProjectCard } from './ProjectCard';
import type { Project } from '../types/project';

type KanbanBoardProps = {
  projects: Project[];
  onProjectOpen?: (project: Project) => void;
  onProjectEdit?: (project: Project) => void;
  onAddProject?: (status: Project['status']) => void;
};

type KanbanColumnConfig = {
  status: Project['status'];
  label: string;
  icon: LucideIcon;
  iconClassName: string;
};

const columns: KanbanColumnConfig[] = [
  { status: 'todo', label: 'À faire', icon: AlertCircle, iconClassName: 'text-[#e60012]' },
  { status: 'in-progress', label: 'En cours', icon: Clock3, iconClassName: 'text-[#1256a6]' },
  { status: 'review', label: 'En révision', icon: Eye, iconClassName: 'text-[#1256a6]' },
  { status: 'done', label: 'Terminé', icon: CheckCircle2, iconClassName: 'text-[#00a94f]' },
];

export function KanbanBoard({ projects, onProjectOpen, onProjectEdit, onAddProject }: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
      {columns.map((column) => {
        const Icon = column.icon;
        const columnProjects = projects.filter((project) => project.status === column.status);

        return (
          <section key={column.status} className="min-w-0">
            <div className="mb-4 flex h-16 items-center justify-between rounded-lg bg-[#fafafa] px-4 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
              <div className="flex min-w-0 items-center gap-2">
                <Icon className={`h-4 w-4 shrink-0 ${column.iconClassName}`} strokeWidth={2} />
                <h2 className="truncate text-base font-semibold text-[#172033]">{column.label}</h2>
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[#4b908d] px-2 text-xs font-semibold text-white">
                  {columnProjects.length}
                </span>
              </div>
              <ToolTip text={`Ajouter dans ${column.label}`}>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#4c5258] transition hover:bg-[#ece9e4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4b908d]/30"
                  aria-label={`Ajouter un projet ${column.label}`}
                  onClick={() => onAddProject?.(column.status)}
                >
                  <Plus className="h-4 w-4" strokeWidth={2} />
                </button>
              </ToolTip>
            </div>

            <div className="space-y-3">
              {columnProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={onProjectOpen}
                  onEdit={onProjectEdit}
                  variant="kanban"
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
