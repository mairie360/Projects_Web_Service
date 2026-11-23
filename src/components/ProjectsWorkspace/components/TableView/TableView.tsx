'use client';

import { useEffect, useRef, useState } from 'react';
import { Checkbox, DataTable, PriorityPill, ProgressMeter, StatusBadge, StatusPill, TagList, UserIdentity } from '@mairie360/lib-components/primitives';
import type { DataTableColumn } from '@mairie360/lib-components/primitives';
import { CalendarDays } from 'lucide-react';
import { formatProjectDate, getProjectNumber, isProjectOverdue, projectStatusBadge } from '../../project-card-meta';
import { priorityRank, sortableDate, sortRows, statusRank, type SortValue, type TableSort } from '../../table-sort';
import { ProjectActionsMenu } from '../ProjectCard/components/ProjectActionsMenu';
import type { Project } from '@/types/project';
import { ProjectsEmptyState as EmptyState } from '../ProjectsEmptyState';
import { SelectionBar } from './components/SelectionBar';

type SortKey = 'key' | 'title' | 'status' | 'priority' | 'responsible' | 'dueDate' | 'progress';

const sortValue: Record<SortKey, (project: Project) => SortValue> = {
  key: (project) => getProjectNumber(project),
  title: (project) => project.title,
  status: (project) => statusRank(project.status),
  priority: (project) => priorityRank(project.priority),
  responsible: (project) => project.responsible.name,
  dueDate: (project) => sortableDate(project.dueDate),
  progress: (project) => project.progress,
};

/** Client-side sort of the loaded page (MAIR-833, lib mechanism of MAIR-1138): the contract has no sort parameter. */
export function sortProjects(projects: Project[], sort: TableSort<SortKey> | null) {
  return sortRows(projects, sort, sortValue);
}

function SelectAll({ projects, selectedIds, onChange }: { projects: Project[]; selectedIds: ReadonlySet<string>; onChange: (ids: string[], selected: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const selectable = projects.filter(canSelect);
  const count = selectable.filter((project) => selectedIds.has(project.id)).length;
  const all = selectable.length > 0 && count === selectable.length;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = count > 0 && !all;
  }, [count, all]);
  return (
    <Checkbox
      ref={ref}
      size="s"
      label={<span className="sr-only">Tout sélectionner</span>}
      checked={all}
      disabled={selectable.length === 0}
      onChange={() => onChange(selectable.map((project) => project.id), !all)}
    />
  );
}

const canSelect = (project: Project) => project.permissions?.canDelete !== false;

export function TableView({
  projects,
  duplicatingProjectIds = [],
  unverifiedDuplicationSourceIds,
  selectedProjectIds,
  onProjectOpen,
  onProjectStatusChange,
  onProjectDuplicate,
  onProjectDelete,
  onProjectEdit,
  onSelectionChange,
  onClearSelection,
  onDeleteSelection,
  onResetFilters,
}: {
  projects: Project[];
  duplicatingProjectIds?: string[];
  unverifiedDuplicationSourceIds?: ReadonlySet<string>;
  /** MAIR-833: rows checked for a bulk action; without `onSelectionChange` the table has no selection column. */
  selectedProjectIds?: ReadonlySet<string>;
  onProjectOpen: (project: Project) => void;
  onProjectStatusChange?: (project: Project, status: Project['status']) => void | Promise<void>;
  onProjectDuplicate: (project: Project) => void;
  onProjectDelete: (project: Project) => void;
  /** MAIR-1134: « Modifier » of the row menu. */
  onProjectEdit?: (project: Project) => void;
  onSelectionChange?: (projectIds: string[], selected: boolean) => void;
  onClearSelection?: () => void;
  onDeleteSelection?: () => void;
  /** Shown in the empty state when a search or a filter hides every project (MAIR-829). */
  onResetFilters?: () => void;
}) {
  const [sort, setSort] = useState<TableSort<SortKey> | null>(null);
  if (projects.length === 0) return <EmptyState onReset={onResetFilters} />;

  const selected = selectedProjectIds ?? new Set<string>();
  const canView = (project: Project) => project.permissions?.canView !== false;
  const selection: DataTableColumn<Project>[] = onSelectionChange ? [{
    key: 'select',
    header: <SelectAll projects={projects} selectedIds={selected} onChange={onSelectionChange} />,
    kind: 'content',
    width: '48px',
    cell: (project) => (
      // The row opens the project on click: the checkbox keeps its own click.
      <div onClick={(event) => event.stopPropagation()}>
        <Checkbox
          size="s"
          label={<span className="sr-only">{`Sélectionner ${project.title}`}</span>}
          checked={selected.has(project.id)}
          disabled={!canSelect(project)}
          onChange={(event) => onSelectionChange([project.id], event.target.checked)}
        />
      </div>
    ),
  }] : [];
  const columns: DataTableColumn<Project>[] = [
    ...selection,
    { key: 'key', header: 'Clé', sortable: true, width: '72px', cell: (project) => <span className="text-[var(--mairie-text-muted)]">{getProjectNumber(project)}</span> },
    {
      key: 'title',
      header: 'Projet',
      kind: 'content',
      sortable: true,
      width: '28%',
      cell: (project) => (
        <div className="max-w-[360px]">
          <button
            type="button"
            aria-label={`Ouvrir la fiche du projet ${project.title}`}
            disabled={!canView(project)}
            className="block w-full truncate text-left font-semibold text-[var(--mairie-text)] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mairie-focus)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={(event) => { event.stopPropagation(); onProjectOpen(project); }}
          >
            {project.title}
          </button>
          <div className="truncate text-sm text-[var(--mairie-text-muted)]">{project.description}</div>
          <TagList label="Étiquettes du projet" items={project.labels} size="s" className="mt-1" />
        </div>
      ),
    },
    { key: 'status', header: 'Statut', kind: 'content', sortable: true, cell: (project) => <StatusBadge status={projectStatusBadge[project.status]} /> },
    { key: 'priority', header: 'Priorité', kind: 'content', sortable: true, cell: (project) => <PriorityPill level={project.priority} /> },
    {
      key: 'responsible',
      header: 'Responsable',
      kind: 'content',
      sortable: true,
      cell: (project) => <UserIdentity name={project.responsible.name} variant="nameOnly" size="s" />,
    },
    {
      key: 'dueDate',
      header: 'Échéance',
      kind: 'content',
      sortable: true,
      cell: (project) => isProjectOverdue(project)
        ? (
          // The pill replaces the date (Figma F1 1.2); the date stays available on hover and to screen readers.
          <span title={`Échéance : ${formatProjectDate(project.dueDate)}`}>
            <StatusPill label="En retard" tone="danger" dot />
            <span className="sr-only">{`, échéance ${formatProjectDate(project.dueDate)}`}</span>
          </span>
        )
        : (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <CalendarDays aria-hidden className="h-4 w-4 shrink-0 text-[var(--mairie-text-muted)]" strokeWidth={1.8} />
            {formatProjectDate(project.dueDate)}
          </span>
        ),
    },
    {
      key: 'progress',
      header: 'Progression',
      kind: 'content',
      sortable: true,
      cell: (project) => <div className="w-36"><ProgressMeter label="Progression" value={project.progress} size="s" showValue /></div>,
    },
    {
      key: 'actions',
      header: 'Actions',
      kind: 'actions',
      hideHeader: true,
      cell: (project) => (
        <ProjectActionsMenu
          project={project}
          duplicationPending={duplicatingProjectIds.includes(project.id)}
          duplicationVerificationRequired={unverifiedDuplicationSourceIds?.has(project.id)}
          onOpen={onProjectOpen}
          onChangeStatus={onProjectStatusChange}
          onDuplicate={onProjectDuplicate}
          onDelete={onProjectDelete}
          onEdit={onProjectEdit}
        />
      ),
    },
  ];

  return (
    <>
      {onClearSelection && onDeleteSelection && (
        <SelectionBar count={projects.filter((project) => selected.has(project.id)).length} onClear={onClearSelection} onDelete={onDeleteSelection} />
      )}
      <DataTable
        label="Projets"
        columns={columns}
        rows={sortProjects(projects, sort)}
        rowKey={(project) => project.id}
        className="min-w-[1060px]"
        sort={sort ?? undefined}
        onSort={(key, direction) => setSort({ key: key as SortKey, direction })}
        // The title button is the keyboard entry; a pointer click on the rest of the row opens the same detail.
        rowProps={(project) => ({
          className: [
            canView(project) ? 'cursor-pointer' : '',
            selected.has(project.id) ? 'bg-[var(--mairie-accent-surface)]' : '',
          ].join(' ').trim() || undefined,
          'data-selected': selected.has(project.id) ? 'true' : undefined,
          onClick: () => { if (canView(project)) onProjectOpen(project); },
        } as React.HTMLAttributes<HTMLTableRowElement>)}
      />
    </>
  );
}
