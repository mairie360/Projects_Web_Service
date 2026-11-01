'use client';

import { Grid3X3, Kanban, List } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ViewMode } from '@/lib/projectPageState';

const viewIcons: Record<ViewMode, LucideIcon> = {
  kanban: Kanban,
  grid: Grid3X3,
  table: List,
};

export function ViewToggle({
  value,
  options,
  onChange,
}: {
  value: ViewMode;
  options: Array<{ value: ViewMode; label: string }>;
  onChange: (value: ViewMode) => void;
}) {
  return (
    <div className="inline-flex h-10 rounded-lg bg-[#ebe9e6] p-1" role="tablist" aria-label="Vue des projets">
      {options.map((option) => {
        const Icon = viewIcons[option.value];
        const active = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`inline-flex min-w-[82px] items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
              active ? 'bg-white text-[#172033] shadow-sm' : 'text-[#3f4750] hover:bg-white/70'
            }`}
            onClick={() => onChange(option.value)}
          >
            <Icon className="h-4 w-4" strokeWidth={1.8} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
