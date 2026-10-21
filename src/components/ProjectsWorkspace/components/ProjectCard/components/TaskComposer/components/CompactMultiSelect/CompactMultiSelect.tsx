'use client';

import React from 'react';
import { CheckCircle2, Tag } from 'lucide-react';
import type { SelectOption } from '../../../../project-card-types';

export function CompactMultiSelect({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[];
  options: SelectOption[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const selectedOptions = options.filter((option) => values.includes(option.value));

  React.useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (fieldRef.current && !fieldRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((currentValue) => currentValue !== value));
      return;
    }

    onChange([...values, value]);
  };

  return (
    <div ref={fieldRef} className="relative">
      <button
        type="button"
        className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-[#d0d7de] bg-white px-2 text-left text-xs text-[#24292f] outline-none transition hover:bg-[#f6f8fa] focus-visible:border-[#0969da] focus-visible:ring-2 focus-visible:ring-[#0969da]/20"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selectedOptions.length > 0 ? 'truncate' : 'truncate text-[#6e7781]'}>
          {selectedOptions.length > 0 ? `${selectedOptions.length} sélectionné(s)` : label}
        </span>
        <Tag className="h-3.5 w-3.5 shrink-0 text-[#57606a]" strokeWidth={1.8} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-[80] max-h-48 w-full overflow-y-auto rounded-md border border-[#d0d7de] bg-white py-1 shadow-[0_8px_24px_rgba(140,149,159,0.22)]"
          role="listbox"
          aria-label={label}
          aria-multiselectable="true"
        >
          {options.map((option) => {
            const selected = values.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className="flex min-h-8 w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-[#24292f] transition hover:bg-[#f6f8fa]"
                onClick={() => toggleValue(option.value)}
              >
                <span
                  className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    selected ? 'border-[#0969da] bg-[#0969da] text-white' : 'border-[#d0d7de] bg-white text-transparent'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" strokeWidth={2.4} />
                </span>
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
