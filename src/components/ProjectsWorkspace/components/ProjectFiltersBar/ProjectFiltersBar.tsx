'use client';

import { Grid3X3, Kanban, List } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DateField, FilterSelect, SearchField, SegmentedControl } from '@mairie360/lib-components/primitives';
import type { FilterOption, ViewMode } from '@/lib/projectPageState';

const ALL = 'all';
const viewIcons: Record<ViewMode, LucideIcon> = { kanban: Kanban, grid: Grid3X3, table: List };

export interface ProjectFiltersBarProps {
  search: string;
  status: string;
  priority: string;
  dueBefore: string;
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  viewMode: ViewMode;
  views: Array<{ value: ViewMode; label: string }>;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onDueBeforeChange: (value: string) => void;
  onViewModeChange: (value: ViewMode) => void;
}

/** The BFF lists « Tous les statuts » as the `all` option; the lib filter calls it its empty value. */
function LibFilter({ label, value, options, onChange }: { label: string; value: string; options: FilterOption[]; onChange: (value: string) => void }) {
  const all = options.find((option) => option.value === ALL);
  return (
    <FilterSelect
      label={label}
      value={value === ALL ? '' : value}
      options={options.filter((option) => option.value !== ALL).map(({ value: optionValue, label: optionLabel }) => ({ value: optionValue, label: optionLabel }))}
      allLabel={all?.label}
      onChange={(next) => onChange(next || ALL)}
    />
  );
}

/** Search, status/priority/due filters and the Kanban/grid/table switch, all lib-components (MAIR-828). */
export const ProjectFiltersBar = ({
  search, status, priority, dueBefore, statusOptions, priorityOptions, viewMode, views,
  onSearchChange, onStatusChange, onPriorityChange, onDueBeforeChange, onViewModeChange,
}: ProjectFiltersBarProps) => (
  <section className="border-b border-[var(--mairie-border)] py-6" aria-label="Filtres des projets">
    <div className="flex flex-col items-start gap-4 2xl:flex-row 2xl:flex-wrap 2xl:items-end 2xl:justify-between">
      <div className="flex w-full min-w-0 flex-1 flex-col gap-3 xl:flex-row xl:items-end 2xl:basis-[50rem]">
        <div className="w-full md:min-w-[280px] md:max-w-[448px] md:flex-1 2xl:min-w-[240px]">
          <SearchField
            aria-label="Rechercher un projet"
            value={search}
            placeholder="Rechercher des projets..."
            onChange={(event) => onSearchChange(event.target.value)}
            onClear={search ? () => onSearchChange('') : undefined}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <LibFilter label="Statut" value={status} options={statusOptions} onChange={onStatusChange} />
          <LibFilter label="Priorité" value={priority} options={priorityOptions} onChange={onPriorityChange} />
          <div className="w-full sm:w-44">
            <DateField
              id="projects-due-before"
              label="Échéance avant"
              aria-label="Échéance avant"
              value={dueBefore}
              onChange={(event) => onDueBeforeChange(event.target.value)}
            />
          </div>
        </div>
      </div>

      <SegmentedControl
        label="Vue des projets"
        value={viewMode}
        options={views.map((view) => ({ key: view.value, label: view.label, icon: viewIcons[view.value] }))}
        onChange={onViewModeChange}
      />
    </div>
  </section>
);
