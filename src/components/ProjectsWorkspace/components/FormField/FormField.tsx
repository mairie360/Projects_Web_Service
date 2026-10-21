'use client';

import { NO_MARKUP_HINT, NO_MARKUP_PATTERN } from '@/lib/text-constraints';
import { FieldLabel } from '../FieldLabel';
import { fieldClassName } from '../../field-style';

/** Text input of the project forms; the BFF refuses `<` and `>` in every text (MAIR-514). */
export function FormField({
  id,
  label,
  value,
  required = false,
  placeholder,
  maxLength,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
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
        pattern={NO_MARKUP_PATTERN}
        title={NO_MARKUP_HINT}
        maxLength={maxLength}
        className={fieldClassName}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
