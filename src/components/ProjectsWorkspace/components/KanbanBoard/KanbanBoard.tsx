'use client';

import React from 'react';
import { IconButton, StatusBadge, ToolTip } from '@mairie360/lib-components/primitives';
import { Plus } from 'lucide-react';

import { ProjectCard } from '../ProjectCard';
import { projectStatusBadge } from '../../project-card-meta';
import type { Project } from '@/types/project';

type KanbanBoardProps = {
  projects: Project[];
  duplicatingProjectIds?: string[];
  unverifiedDuplicationSourceIds?: ReadonlySet<string>;
  columns: Array<{ status: Project['status']; label: string }>;
  onProjectOpen?: (project: Project) => void;
  onProjectDuplicate?: (project: Project) => void;
  onProjectDelete?: (project: Project) => void;
  onAddProject?: (status: Project['status']) => void;
  /** Status change, by drag and drop or by the card menu (MAIR-829). */
  onMoveProject?: (project: Project, status: Project['status']) => Promise<void>;
};

export function KanbanBoard({
  projects,
  duplicatingProjectIds = [],
  unverifiedDuplicationSourceIds,
  columns,
  onProjectOpen,
  onProjectDuplicate,
  onProjectDelete,
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

  const moveProject = async (project: Project, status: Project['status']) => {
    if (moving.current) return;
    moving.current = true;
    setMovingId(project.id);
    try {
      await onMoveProject?.(project, status);
    } finally {
      moving.current = false;
      setMovingId(null);
    }
  };

  const dropProject = async (event: React.DragEvent, status: Project['status']) => {
    event.preventDefault();
    if (moving.current || !dragged || !acceptsDrop(status) || event.dataTransfer.getData('application/x-mairie360-project') !== dragged.id) return;

    const project = dragged;
    endDrag();
    await moveProject(project, status);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <p id={instructionsId} className="sr-only">
        Glissez une carte vers une autre colonne pour changer son statut. Au clavier ou sur mobile, utilisez « Changer le statut » dans le menu Actions du projet.
      </p>
      {columns.map((column) => {
        const columnProjects = projects.filter((project) => project.status === column.status);

        return (
          <section
            key={column.status}
            className={`min-w-0 rounded-lg border border-[var(--mairie-border)] bg-[var(--mairie-background)] p-3 transition-colors ${targetStatus === column.status ? 'bg-[var(--mairie-accent-surface)] ring-2 ring-[var(--mairie-accent)]' : ''}`}
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
            <div className="mb-3 flex h-10 items-center justify-between gap-2">
              <h2 className="flex min-w-0 items-center gap-2">
                <StatusBadge status={projectStatusBadge[column.status]} label={column.label} />
                <span className="text-sm text-[var(--mairie-muted)]" aria-label={`${columnProjects.length} projet${columnProjects.length > 1 ? 's' : ''}`}>{columnProjects.length}</span>
              </h2>
              {onAddProject && <ToolTip text={`Ajouter dans ${column.label}`}>
                <IconButton icon={Plus} label={`Ajouter un projet ${column.label}`} size="s" onClick={() => onAddProject(column.status)} />
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
                  className={draggedId === project.id ? 'opacity-40' : ''}
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
                    duplicationPending={duplicatingProjectIds.includes(project.id)}
                    duplicationVerificationRequired={unverifiedDuplicationSourceIds?.has(project.id)}
                    onOpen={onProjectOpen}
                    onDuplicate={onProjectDuplicate}
                    onDelete={onProjectDelete}
                    onChangeStatus={onMoveProject && canMove(project) ? moveProject : undefined}
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
