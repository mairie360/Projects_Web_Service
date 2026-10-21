'use client';

import type { FilterOption } from '@/lib/projectPageState';
import { FieldLabel } from '../FieldLabel';
import { fieldClassName } from '../../field-style';

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
