'use client';

import React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import type { FilterOption } from '@/lib/projectPageState';
import { FieldLabel } from '../FieldLabel';

export function MultiSelectField({
  id,
  label,
  values,
  options,
  placeholder = 'Sélectionner...',
  onChange,
}: {
  id: string;
  label: string;
  values: string[];
  options: FilterOption[];
  placeholder?: string;
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const selectedOptions = options.filter((option) => values.includes(option.value));

  React.useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (fieldRef.current && !fieldRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, [open]);

  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((currentValue) => currentValue !== value));
      return;
    }

    onChange([...values, value]);
  };

  const removeValue = (value: string) => {
    onChange(values.filter((currentValue) => currentValue !== value));
  };

  return (
    <div ref={fieldRef} onKeyDown={(event) => {
      if (open && event.key === 'Escape' && !event.nativeEvent.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }}>
      <FieldLabel htmlFor={id} label={label} />
      <div className="relative">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          className="mt-2 flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 py-2 text-left text-sm text-[#24292f] shadow-sm transition hover:bg-white focus-visible:border-[#0969da] focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da]/20"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span className={selectedOptions.length > 0 ? 'text-[#24292f]' : 'text-[#6e7781]'}>
            {selectedOptions.length > 0 ? `${selectedOptions.length} sélectionné(s)` : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#57606a]" strokeWidth={1.8} />
        </button>

        {open && (
          <div
            className="absolute left-0 top-[calc(100%+6px)] z-[90] max-h-60 w-full overflow-y-auto rounded-md border border-[#d0d7de] bg-white py-1 shadow-[0_8px_24px_rgba(140,149,159,0.24)]"
            role="listbox"
            aria-multiselectable="true"
            aria-label={label}
          >
            {options.map((option) => {
              const selected = values.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="flex min-h-9 w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#24292f] transition hover:bg-[#f6f8fa]"
                  onClick={() => toggleValue(option.value)}
                >
                  <span
                    className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      selected
                        ? 'border-[#0969da] bg-[#0969da] text-white'
                        : 'border-[#d0d7de] bg-white text-transparent'
                    }`}
                  >
                    <Check className="h-3 w-3" strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedOptions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#d0d7de] bg-white px-2 py-1 text-xs font-medium text-[#24292f]"
            >
              <span className="truncate">{option.label}</span>
              <button
                type="button"
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[#57606a] hover:bg-[#d8dee4] hover:text-[#24292f]"
                aria-label={`Retirer ${option.label}`}
                onClick={() => removeValue(option.value)}
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
