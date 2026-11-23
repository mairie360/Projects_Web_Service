'use client';

import { FilterSelect, SearchField, SegmentedControl } from '@mairie360/lib-components/primitives';
import { Kanban, List } from 'lucide-react';

import type { FilterOption } from '@/lib/projectPageState';

export type TaskView = 'board' | 'list';

export interface TaskToolbarProps {
  search: string;
  assignee: string;
  priority: string;
  assigneeOptions: FilterOption[];
  priorityOptions: FilterOption[];
  view: TaskView;
  onSearchChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onViewChange: (view: TaskView) => void;
}

/** MAIR-859 (C7, Figma F6 6.2): search, « Tous les assignés », « Toutes les priorités » and the Tableau / Liste switch. */
export function TaskToolbar({
  search, assignee, priority, assigneeOptions, priorityOptions, view, onSearchChange, onAssigneeChange, onPriorityChange, onViewChange,
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
