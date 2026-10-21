'use client';

import { Check, ChevronDown, Grid3X3, Kanban, List, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { type FilterOption, type ViewMode } from '../../../lib/projectPageState';

const viewIcons: Record<ViewMode, LucideIcon> = {
  kanban: Kanban,
  grid: Grid3X3,
  table: List,
};

export function FilterSelect({
  label,
  value,
  options,
  open,
  widthClassName = 'sm:w-40',
  onOpenChange,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  open: boolean;
  widthClassName?: string;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
}) {
  if (options.length === 0) return null;

  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className={`relative w-full ${widthClassName}`}>
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between rounded-md border border-[#d0ccc7] bg-white px-3 text-left text-sm text-[#2f3438] shadow-sm transition hover:border-[#b9d6d5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4b908d]/25"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#8a8f94]" strokeWidth={1.8} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-30 w-full overflow-hidden rounded-md border border-[#d9d5d0] bg-white py-1 shadow-[0_8px_20px_rgba(28,31,35,0.15)]"
          role="listbox"
          aria-label={label}
        >
          {options.map((option) => {
            const isActive = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`flex h-9 w-full items-center justify-between px-3 text-left text-sm transition ${
                  isActive ? 'bg-[#d4eeee] text-[#2b706c]' : 'text-[#2f3438] hover:bg-[#f4f1ee]'
                }`}
                onClick={() => {
                  onChange(option.value);
                  onOpenChange(false);
                }}
              >
                <span>{option.label}</span>
                {isActive && <Check className="h-4 w-4" strokeWidth={1.9} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

export function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative w-full max-w-[448px]">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b97a6]" />
      <input
        type="search"
        value={value}
        placeholder="Rechercher des projets..."
        className="h-10 w-full rounded-md border border-[#d0ccc7] bg-white py-2 pl-11 pr-4 text-sm text-[#172033] shadow-sm outline-none transition placeholder:text-[#66768a] focus:border-[#4b908d] focus:ring-2 focus:ring-[#4b908d]/15"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

