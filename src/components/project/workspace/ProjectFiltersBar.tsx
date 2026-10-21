import type { FilterOption, ViewMode } from '../../../lib/projectPageState';
import { FilterSelect, SearchInput, ViewToggle } from '../ProjectViews';

export interface ProjectFiltersBarProps {
  search: string;
  status: string;
  priority: string;
  dueBefore: string;
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  openFilter: 'status' | 'priority' | null;
  viewMode: ViewMode;
  views: Array<{ value: ViewMode; label: string }>;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onDueBeforeChange: (value: string) => void;
  onOpenFilterChange: (filter: 'status' | 'priority' | null) => void;
  onViewModeChange: (value: ViewMode) => void;
}

/** Search, status/priority/due filters and the Kanban/grid/table switch. */
export const ProjectFiltersBar = ({
  search, status, priority, dueBefore, statusOptions, priorityOptions, openFilter, viewMode, views,
  onSearchChange, onStatusChange, onPriorityChange, onDueBeforeChange, onOpenFilterChange, onViewModeChange,
}: ProjectFiltersBarProps) => (
  <section className="border-b border-[#e3e0dc] py-7">
    <div className="flex flex-col items-start gap-4 2xl:flex-row 2xl:flex-wrap 2xl:items-center 2xl:justify-between">
      <div className="flex w-full min-w-0 flex-1 flex-col gap-3 xl:flex-row xl:items-center 2xl:basis-[50rem]">
        <div className="w-full md:min-w-[280px] md:max-w-[448px] md:flex-1 2xl:min-w-[240px]">
          <SearchInput value={search} onChange={onSearchChange} />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <FilterSelect
            label="Filtrer par statut"
            value={status}
            options={statusOptions}
            open={openFilter === 'status'}
            onOpenChange={(open) => onOpenFilterChange(open ? 'status' : null)}
            onChange={onStatusChange}
          />
          <FilterSelect
            label="Filtrer par priorité"
            value={priority}
            options={priorityOptions}
            open={openFilter === 'priority'}
            widthClassName="sm:w-48"
            onOpenChange={(open) => onOpenFilterChange(open ? 'priority' : null)}
            onChange={onPriorityChange}
          />
          <label className="block w-full sm:w-44" title="Filtrer par échéance maximale">
            <span className="mb-1 block text-sm font-medium">Échéance avant</span>
            <input
              type="date"
              aria-label="Échéance avant"
              value={dueBefore}
              className="h-10 w-full rounded-md border border-[#d0ccc7] bg-white px-3 text-sm font-normal text-[#2f3438] shadow-sm outline-none transition focus:border-[#4b908d] focus:ring-2 focus:ring-[#4b908d]/15"
              onChange={(event) => onDueBeforeChange(event.target.value)}
            />
          </label>
        </div>
      </div>

      <ViewToggle value={viewMode} options={views} onChange={onViewModeChange} />
    </div>
  </section>
);
