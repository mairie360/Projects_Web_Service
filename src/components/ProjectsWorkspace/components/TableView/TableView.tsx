'use client';

import { Avatar, DataTable, PriorityPill, ProgressMeter, StatusBadge } from '@mairie360/lib-components/primitives';
import type { DataTableColumn } from '@mairie360/lib-components/primitives';
import { formatProjectDate, projectStatusBadge } from '../../project-card-meta';
import { ProjectActionsMenu } from '../ProjectCard/components/ProjectActionsMenu';
import type { Project } from '@/types/project';
import { ProjectsEmptyState as EmptyState } from '../ProjectsEmptyState';

export function TableView({
  projects,
  duplicatingProjectIds = [],
  unverifiedDuplicationSourceIds,
  onProjectOpen,
  onProjectEdit,
  onProjectDuplicate,
  onProjectDelete,
}: {
  projects: Project[];
  duplicatingProjectIds?: string[];
  unverifiedDuplicationSourceIds?: ReadonlySet<string>;
  onProjectOpen: (project: Project) => void;
  onProjectEdit: (project: Project) => void;
  onProjectDuplicate: (project: Project) => void;
  onProjectDelete: (project: Project) => void;
}) {
  if (projects.length === 0) return <EmptyState />;

  const canView = (project: Project) => project.permissions?.canView !== false;
  const columns: DataTableColumn<Project>[] = [
    {
      key: 'title',
      header: 'Projet',
      kind: 'content',
      width: '30%',
      cell: (project) => (
        <div className="max-w-[360px]">
          <button
            type="button"
            aria-label={`Ouvrir la fiche du projet ${project.title}`}
            aria-haspopup="dialog"
            disabled={!canView(project)}
            className="block w-full truncate text-left font-semibold text-[var(--mairie-text)] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mairie-focus)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={(event) => { event.stopPropagation(); onProjectOpen(project); }}
          >
            {project.title}
          </button>
          <div className="truncate text-sm text-[var(--mairie-text-muted)]">{project.description}</div>
        </div>
      ),
    },
    { key: 'status', header: 'Statut', kind: 'content', cell: (project) => <StatusBadge status={projectStatusBadge[project.status]} /> },
    {
      key: 'responsible',
      header: 'Responsable',
      kind: 'content',
      cell: (project) => (
        <span className="flex items-center gap-2 text-sm">
          <Avatar alt={project.responsible.name} size="xs" />
          <span>{project.responsible.name}</span>
        </span>
      ),
    },
    { key: 'priority', header: 'Priorité', kind: 'content', cell: (project) => <PriorityPill level={project.priority} /> },
    {
      key: 'progress',
      header: 'Progression',
      kind: 'content',
      cell: (project) => <div className="w-36"><ProgressMeter label="Progression" value={project.progress} size="s" /></div>,
    },
    { key: 'dueDate', header: 'Échéance', cell: (project) => formatProjectDate(project.dueDate) },
    {
      key: 'actions',
      header: 'Actions',
      kind: 'actions',
      cell: (project) => (
        <ProjectActionsMenu
          project={project}
          duplicationPending={duplicatingProjectIds.includes(project.id)}
          duplicationVerificationRequired={unverifiedDuplicationSourceIds?.has(project.id)}
          onEdit={onProjectEdit}
          onDuplicate={onProjectDuplicate}
          onDelete={onProjectDelete}
        />
      ),
    },
  ];

  return (
    <DataTable
      label="Projets"
      columns={columns}
      rows={projects}
      rowKey={(project) => project.id}
      className="min-w-[1060px]"
      // The title button is the keyboard entry; a pointer click on the rest of the row opens the same detail.
      rowProps={(project) => ({
        className: canView(project) ? 'cursor-pointer' : undefined,
        onClick: () => { if (canView(project)) onProjectOpen(project); },
      })}
    />
  );
}
