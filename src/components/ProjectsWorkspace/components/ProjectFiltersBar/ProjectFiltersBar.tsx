'use client';

import { Grid3X3, Kanban, List, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, FilterSelect, SearchField, SegmentedControl } from '@mairie360/lib-components/primitives';
import type { FilterOption, ViewMode } from '@/lib/projectPageState';
import { PROJECT_DUE_OPTIONS, type ProjectDueRange } from '../../project-due-range';

const ALL = 'all';
const viewIcons: Record<ViewMode, LucideIcon> = { kanban: Kanban, grid: Grid3X3, table: List };
/** Order of the view switch in the artifact: Kanban, Tableau, Grille. */
export const PROJECT_VIEW_ORDER: readonly ViewMode[] = ['kanban', 'table', 'grid'];

/** The BFF views in the artifact order (unknown views last, in their BFF order). */
export function orderProjectViews<T extends { value: ViewMode }>(views: readonly T[]): T[] {
  const rank = (view: ViewMode) => {
    const index = PROJECT_VIEW_ORDER.indexOf(view);
    return index === -1 ? PROJECT_VIEW_ORDER.length : index;
  };
  return [...views].sort((left, right) => rank(left.value) - rank(right.value));
}

export interface ProjectFiltersBarProps {
  search: string;
  status: string;
  priority: string;
  dueRange: ProjectDueRange;
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  viewMode: ViewMode;
  views: Array<{ value: ViewMode; label: string }>;
  /** The search or a filter is set: « Effacer » is shown. */
  filtersActive?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onDueRangeChange: (value: ProjectDueRange) => void;
  onViewModeChange: (value: ViewMode) => void;
  onResetFilters?: () => void;
}

/**
 * The lib filter names itself by its « no filter » label, as the artifact shows it (« Tous les statuts »); the BFF
 * lists that choice as its `all` option, the lib calls it its empty value.
 */
function LibFilter({ label, value, options, onChange }: { label: string; value: string; options: FilterOption[]; onChange: (value: string) => void }) {
  return (
    <FilterSelect
      label={label}
      value={value === ALL ? '' : value}
      options={options.filter((option) => option.value !== ALL).map(({ value: optionValue, label: optionLabel }) => ({ value: optionValue, label: optionLabel }))}
      allLabel={label}
      onChange={(next) => onChange(next || ALL)}
    />
  );
}

/**
 * Search, status/priority/due-date filters (no label above them, as in the artifact) and, on its own row, the
 * Kanban/Tableau/Grille switch, all lib-components (MAIR-828, MAIR-1134).
 */
export const ProjectFiltersBar = ({
  search, status, priority, dueRange, statusOptions, priorityOptions, viewMode, views, filtersActive = false,
  onSearchChange, onStatusChange, onPriorityChange, onDueRangeChange, onViewModeChange, onResetFilters,
}: ProjectFiltersBarProps) => (
  <section className="border-b border-[var(--mairie-border)] py-6" aria-label="Filtres des projets">
    {/* MAIR-1134 (C6): search and filters on one row, the view switch on its own row under them, left aligned:
        it never moves, whatever the view or the active filters. */}
    <div className="flex flex-col items-start gap-4">
      <div className="flex w-full min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
        <div className="w-full md:min-w-[260px] md:max-w-[360px] md:flex-1">
          <SearchField
            aria-label="Rechercher un projet"
            label={<span className="sr-only">Rechercher un projet</span>}
            value={search}
            placeholder="Rechercher un projet, une étiquette…"
            onChange={(event) => onSearchChange(event.target.value)}
            onClear={search ? () => onSearchChange('') : undefined}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <LibFilter label="Tous les statuts" value={status} options={statusOptions} onChange={onStatusChange} />
          <LibFilter label="Toutes les priorités" value={priority} options={priorityOptions} onChange={onPriorityChange} />
          <FilterSelect
            label="Échéance"
            allLabel="Toutes les échéances"
            value={dueRange}
            options={PROJECT_DUE_OPTIONS}
            onChange={(next) => onDueRangeChange(next as ProjectDueRange)}
          />
          {filtersActive && onResetFilters && (
            <Button variant="ghost" tone="neutral" icon={X} label="Effacer" onClick={onResetFilters} />
          )}
        </div>
      </div>

      <SegmentedControl
        className="self-start"
        label="Vue des projets"
        value={viewMode}
        options={orderProjectViews(views).map((view) => ({ key: view.value, label: view.label, icon: viewIcons[view.value] }))}
        onChange={onViewModeChange}
      />
    </div>
  </section>
);
