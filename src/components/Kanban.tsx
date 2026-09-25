'use client';

import React from 'react';
import { ToolTip } from '@mairie360/lib-components';
import { AlertCircle, CheckCircle2, Clock3, Eye, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { ProjectCard } from './ProjectCard';
import type { Project, ProjectTaskDraft } from '../types/project';

type SelectOption = {
  label: string;
  value: string;
};

type KanbanBoardProps = {
  projects: Project[];
  columns: Array<{ status: Project['status']; label: string }>;
  memberOptions?: SelectOption[];
  labelOptions?: SelectOption[];
  onProjectOpen?: (project: Project) => void;
  onProjectEdit?: (project: Project) => void;
  onProjectDuplicate?: (project: Project) => void;
  onProjectDelete?: (project: Project) => void;
  onProjectTaskAdd?: (project: Project, task: ProjectTaskDraft) => void;
  onAddProject?: (status: Project['status']) => void;
  onMoveProject?: (project: Project, status: Project['status']) => Promise<void>;
};

type KanbanColumnPresentation = {
  icon: LucideIcon;
  iconClassName: string;
};

const columnPresentation: Record<Project['status'], KanbanColumnPresentation> = {
  todo: { icon: AlertCircle, iconClassName: 'text-[#e60012]' },
  'in-progress': { icon: Clock3, iconClassName: 'text-[#1256a6]' },
  review: { icon: Eye, iconClassName: 'text-[#1256a6]' },
  done: { icon: CheckCircle2, iconClassName: 'text-[#00a94f]' },
};

export function KanbanBoard({
  projects,
  columns,
  memberOptions,
  labelOptions,
  onProjectOpen,
  onProjectEdit,
  onProjectDuplicate,
  onProjectDelete,
  onProjectTaskAdd,
  onAddProject,
  onMoveProject,
}: KanbanBoardProps) {
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [targetStatus, setTargetStatus] = React.useState<Project['status'] | null>(null);
  const [movingId, setMovingId] = React.useState<string | null>(null);
  const moving = React.useRef(false);
  const startedOnControl = React.useRef(false);
  const suppressNextClick = React.useRef(false);
  const instructionsId = React.useId();
  const dragged = projects.find((project) => project.id === draggedId);
  const canMove = (project: Project) => Boolean(onMoveProject && movingId === null && project.permissions?.canEdit === true);
  const acceptsDrop = (status: Project['status']) => Boolean(dragged && canMove(dragged) && dragged.status !== status);

  const endDrag = () => {
    setDraggedId(null);
    setTargetStatus(null);
    suppressNextClick.current = true;
  };

  const dropProject = async (event: React.DragEvent, status: Project['status']) => {
    event.preventDefault();
    if (moving.current || !dragged || !acceptsDrop(status) || event.dataTransfer.getData('application/x-mairie360-project') !== dragged.id) return;

    const project = dragged;
    endDrag();
    moving.current = true;
    setMovingId(project.id);
    try {
      await onMoveProject?.(project, status);
    } finally {
      moving.current = false;
      setMovingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
      <p id={instructionsId} className="sr-only">
        Glissez une carte vers une autre colonne pour changer son statut. Au clavier ou sur mobile, utilisez Modifier dans le menu Actions du projet.
      </p>
      {columns.map((column) => {
        const presentation = columnPresentation[column.status];
        const Icon = presentation.icon;
        const columnProjects = projects.filter((project) => project.status === column.status);

        return (
          <section
            key={column.status}
            className={`min-w-0 rounded-md transition-colors ${targetStatus === column.status ? 'bg-[#ddf4ff] ring-2 ring-[#0969da]' : ''}`}
            data-project-status={column.status}
            aria-label={column.label}
            onDragOver={(event) => {
              if (!acceptsDrop(column.status)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setTargetStatus((current: Project['status'] | null) => current === column.status ? current : column.status);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setTargetStatus((current: Project['status'] | null) => current === column.status ? null : current);
              }
            }}
            onDrop={(event) => void dropProject(event, column.status)}
          >
            <div className="mb-3 flex h-12 items-center justify-between rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3">
              <div className="flex min-w-0 items-center gap-2">
                <Icon className={`h-4 w-4 shrink-0 ${presentation.iconClassName}`} strokeWidth={2} />
                <h2 className="truncate text-sm font-semibold text-[#24292f]">{column.label}</h2>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d8dee4] px-1.5 text-xs font-semibold text-[#57606a]">
                  {columnProjects.length}
                </span>
              </div>
              {onAddProject && <ToolTip text={`Ajouter dans ${column.label}`}>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#57606a] transition hover:bg-[#d8dee4] hover:text-[#24292f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da]/30"
                  aria-label={`Ajouter un projet ${column.label}`}
                  onClick={() => onAddProject?.(column.status)}
                >
                  <Plus className="h-4 w-4" strokeWidth={2} />
                </button>
              </ToolTip>}
            </div>

            <div className="min-h-[120px] space-y-2.5">
              {columnProjects.map((project) => (
                <div
                  key={project.id}
                  data-project-id={project.id}
                  role="group"
                  aria-label={project.title}
                  aria-describedby={instructionsId}
                  aria-busy={movingId === project.id}
                  draggable={canMove(project)}
                  className={draggedId === project.id ? 'opacity-50' : ''}
                  onPointerDownCapture={(event) => {
                    suppressNextClick.current = false;
                    startedOnControl.current = Boolean((event.target as Element).closest('button, a, input, textarea, select, [contenteditable="true"]'));
                  }}
                  onDragStart={(event) => {
                    if (moving.current || !canMove(project) || startedOnControl.current) {
                      event.preventDefault();
                      return;
                    }
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('application/x-mairie360-project', project.id);
                    setDraggedId(project.id);
                  }}
                  onDragEnd={endDrag}
                  onClickCapture={(event) => {
                    if (suppressNextClick.current || movingId === project.id) {
                      event.preventDefault();
                      event.stopPropagation();
                      suppressNextClick.current = false;
                    }
                  }}
                >
                  <ProjectCard
                    project={project}
                    memberOptions={memberOptions}
                    labelOptions={labelOptions}
                    onOpen={onProjectOpen}
                    onEdit={onProjectEdit}
                    onDuplicate={onProjectDuplicate}
                    onDelete={onProjectDelete}
                    onAddTask={onProjectTaskAdd}
                    variant="kanban"
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
