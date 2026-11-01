import { Search } from 'lucide-react';

import type { FilterOption } from '@/lib/projectPageState';

export interface TaskFiltersProps {
  search: string;
  status: string;
  priority: string;
  due: string;
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onDueChange: (value: string) => void;
}

/** Search, status, priority and latest due date filters of the task list. */
export const TaskFilters = ({ search, status, priority, due, statusOptions, priorityOptions, onSearchChange, onStatusChange, onPriorityChange, onDueChange }: TaskFiltersProps) => (
  <div className="grid grid-cols-1 gap-2 border-b border-[#dedbd6] bg-white p-3 sm:grid-cols-2 xl:grid-cols-4">
    <label className="relative sm:col-span-2 xl:col-span-1">
      <span className="sr-only">Rechercher une tâche</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6e7781]" />
      <input
        type="search"
        value={search}
        placeholder="Rechercher une tâche"
        className="h-9 w-full rounded-md border border-[#d0d7de] bg-[#f6f8fa] pl-9 pr-3 text-xs outline-none focus:border-[#0969da] focus:bg-white focus:ring-2 focus:ring-[#0969da]/20"
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </label>
    <select
      aria-label="Filtrer les tâches par statut"
      value={status}
      className="h-9 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-2 text-xs outline-none focus:border-[#0969da]"
      onChange={(event) => onStatusChange(event.target.value)}
    >
      <option value="all">Tous les statuts</option>
      {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    <select
      aria-label="Filtrer les tâches par priorité"
      value={priority}
      className="h-9 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-2 text-xs outline-none focus:border-[#0969da]"
      onChange={(event) => onPriorityChange(event.target.value)}
    >
      <option value="all">Toutes les priorités</option>
      {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    <input
      type="date"
      aria-label="Échéance maximale des tâches"
      value={due}
      className="h-9 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-2 text-xs outline-none focus:border-[#0969da]"
      onChange={(event) => onDueChange(event.target.value)}
    />
  </div>
);
