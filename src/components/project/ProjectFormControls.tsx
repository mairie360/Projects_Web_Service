'use client';

import React from 'react';
import { Button } from '@mairie360/lib-components';
import { Check, ChevronDown, PencilLine, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { FilterOption } from '../../lib/projectPageState';

export function ActionButton({
  label,
  icon: Icon,
  primary = false,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <span className="relative inline-flex">
      <Icon
        className={`pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 ${
          primary ? 'text-white' : 'text-[#2f3438]'
        }`}
        strokeWidth={2}
      />
      <Button
        label={label}
        primary={primary ? true : undefined}
        onClick={onClick}
        className={`!h-10 !min-h-0 !rounded-md !pl-10 !pr-4 !text-sm !font-semibold ${
          primary
            ? '!border-[#1256a6] !bg-[#1256a6] !text-white hover:!bg-[#0f4b92]'
            : '!border-[#d9d5d0] !bg-white !text-[#2f3438] hover:!border-[#b9d6d5] hover:!bg-[#fafafa]'
        }`}
      />
    </span>
  );
}

export function FieldLabel({ htmlFor, label, required = false }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-semibold text-[#57606a]">
      {label}
      {required && <span className="ml-1 text-[#cf222e]">*</span>}
    </label>
  );
}

export const fieldClassName =
  'mt-2 h-9 w-full rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm text-[#24292f] shadow-sm outline-none transition placeholder:text-[#6e7781] focus:border-[#0969da] focus:bg-white focus:ring-2 focus:ring-[#0969da]/20';

export function FormField({
  id,
  label,
  value,
  required = false,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} required={required} />
      <input
        id={id}
        value={value}
        required={required}
        placeholder={placeholder}
        className={fieldClassName}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function TextAreaField({
  id,
  label,
  value,
  required = false,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} required={required} />
      <textarea
        id={id}
        value={value}
        required={required}
        rows={8}
        placeholder={placeholder}
        className={`${fieldClassName} h-auto resize-none py-2`}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function SelectField({
  id,
  label,
  value,
  options,
  required = false,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} required={required} />
      <select
        id={id}
        value={value}
        required={required}
        className={fieldClassName}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

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

  const removeValue = (value: string) => {
    onChange(values.filter((currentValue) => currentValue !== value));
  };

  return (
    <div ref={fieldRef}>
      <FieldLabel htmlFor={id} label={label} />
      <div className="relative">
        <button
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

export function TaskEditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-[#0969da] bg-[#ddf4ff] px-3 text-xs font-semibold text-[#0969da] shadow-sm transition hover:border-[#0550ae] hover:bg-[#b6e3ff] hover:text-[#0550ae] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da]/30"
      onClick={onClick}
    >
      <PencilLine className="h-3.5 w-3.5" strokeWidth={2} />
      Modifier
    </button>
  );
}

