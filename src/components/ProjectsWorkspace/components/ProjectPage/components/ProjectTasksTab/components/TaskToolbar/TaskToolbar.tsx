'use client';

import { Button, FilterSelect, SearchField, SegmentedControl } from '@mairie360/lib-components/primitives';
import { Kanban, List, X } from 'lucide-react';

import type { FilterOption } from '@/lib/projectPageState';

export type TaskView = 'board' | 'list';

export interface TaskToolbarProps {
  search: string;
  assignee: string;
  priority: string;
  assigneeOptions: FilterOption[];
  priorityOptions: FilterOption[];
  /** « Tous les statuts »: the board columns; « Toutes les échéances »: the due-date ranges. */
  status: string;
  due: string;
  statusOptions: ReadonlyArray<FilterOption>;
  dueOptions: ReadonlyArray<FilterOption>;
  /** The search or a filter is set: « Réinitialiser les filtres » is shown. */
  active: boolean;
  view: TaskView;
  onSearchChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDueChange: (value: string) => void;
  onReset: () => void;
  onViewChange: (view: TaskView) => void;
}

/**
 * MAIR-859 (C7, Figma F6 6.2): search, « Tous les assignés », « Toutes les priorités », « Tous les statuts »,
 * « Toutes les échéances », « Réinitialiser les filtres » while one is set, and the Tableau / Liste switch.
 */
export function TaskToolbar({
  search, assignee, priority, assigneeOptions, priorityOptions, status, due, statusOptions, dueOptions, active, view,
  onSearchChange, onAssigneeChange, onPriorityChange, onStatusChange, onDueChange, onReset, onViewChange,
}: TaskToolbarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3" role="search" aria-label="Filtres des tâches">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:max-w-[320px] sm:flex-1">
          <SearchField
            aria-label="Rechercher une tâche"
            value={search}
            placeholder="Rechercher une tâche..."
            onChange={(event) => onSearchChange(event.target.value)}
            onClear={search ? () => onSearchChange('') : undefined}
          />
        </div>
        <FilterSelect label="Assignée à" allLabel="Tous les assignés" value={assignee} options={assigneeOptions} onChange={onAssigneeChange} />
        <FilterSelect
          label="Priorité"
          allLabel="Toutes les priorités"
          value={priority}
          options={priorityOptions.filter((option) => option.value !== 'all')}
          onChange={onPriorityChange}
        />
        <FilterSelect label="Statut" allLabel="Tous les statuts" value={status} options={statusOptions} onChange={onStatusChange} />
        <FilterSelect label="Échéance" allLabel="Toutes les échéances" value={due} options={dueOptions} onChange={onDueChange} />
        {active && <Button variant="ghost" tone="neutral" icon={X} label="Réinitialiser les filtres" onClick={onReset} />}
      </div>
      <SegmentedControl
        label="Affichage des tâches"
        value={view}
        options={[{ key: 'board', label: 'Tableau', icon: Kanban }, { key: 'list', label: 'Liste', icon: List }]}
        onChange={onViewChange}
        className="self-start"
      />
    </div>
  );
}
