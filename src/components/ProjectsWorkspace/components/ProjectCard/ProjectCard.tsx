'use client';

import { AvatarStack, PriorityPill, ProgressMeter, StatusBadge, StatusPill, TagList } from '@mairie360/lib-components/primitives';
import { CalendarDays } from 'lucide-react';

import { formatProjectDate, getProjectNumber, isProjectOverdue, projectStatusBadge } from '../../project-card-meta';
import { ProjectActionsMenu } from './components/ProjectActionsMenu';
import type { ProjectCardProps } from './project-card-types';

/**
 * Project card of the Kanban and grid views (MAIR-829, Figma F1): key and « … » menu, title, description,
 * labels, priority, « En retard », due date, progress, team and « x/y tâches ». The grid also shows the status.
 * Tasks are added from the project sheet, not from the card.
 */
export function ProjectCard({
  project,
  variant = 'kanban',
  duplicationPending,
  duplicationVerificationRequired,
  onOpen,
  onDuplicate,
  onDelete,
  onEdit,
  onChangeStatus,
}: ProjectCardProps) {
  const overdue = isProjectOverdue(project);

  return (
    <article
      data-variant={variant}
      className="cursor-pointer rounded-lg border border-[var(--mairie-border)] bg-[var(--mairie-surface)] p-4 shadow-sm transition hover:shadow-md"
      onClick={() => onOpen?.(project)}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--mairie-muted)]">{getProjectNumber(project)}</span>
        <ProjectActionsMenu
          project={project}
          duplicationPending={duplicationPending}
          duplicationVerificationRequired={duplicationVerificationRequired}
          onOpen={onOpen}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onEdit={onEdit}
          onChangeStatus={onChangeStatus}
        />
      </div>

      {variant === 'grid' && <StatusBadge status={projectStatusBadge[project.status]} className="mb-2" />}

      <h3 className="text-base font-semibold leading-snug text-[var(--mairie-text)]">
        <button
          type="button"
          aria-label={`Ouvrir la fiche du projet ${project.title}`}
          className="text-left focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mairie-accent)]"
          onClick={(event) => { event.stopPropagation(); onOpen?.(project); }}
          disabled={!onOpen}
        >
          {project.title}
        </button>
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-[var(--mairie-muted)]">{project.description}</p>

      {project.labels.length > 0 && (
        <TagList label="Étiquettes du projet" items={project.labels} size="s" className="mt-3" />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--mairie-text)]">
        <PriorityPill level={project.priority} />
        {overdue && <StatusPill label="En retard" tone="danger" dot />}
        <span className="inline-flex items-center gap-1">
          <CalendarDays aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span className="sr-only">Échéance : </span>
          {formatProjectDate(project.dueDate)}
        </span>
      </div>

      <ProgressMeter label="Progression" value={project.progress} size="s" className="mt-3" />

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--mairie-border)] pt-3">
        <AvatarStack label="Équipe du projet" people={project.assignees.map((assignee) => ({ name: assignee.name }))} max={3} size="s" />
        <span className="text-sm text-[var(--mairie-muted)]">{project.tasks.completed}/{project.tasks.total} tâches</span>
      </div>
    </article>
  );
}
