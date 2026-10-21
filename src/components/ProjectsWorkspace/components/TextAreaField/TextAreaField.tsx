'use client';

import { NO_MARKUP_HINT, reportMarkupValidity } from '@/lib/text-constraints';
import { FieldLabel } from '../FieldLabel';
import { fieldClassName } from '../../field-style';

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
        title={NO_MARKUP_HINT}
        className={`${fieldClassName} h-auto resize-none py-2`}
        onChange={(event) => { reportMarkupValidity(event.target); onChange(event.target.value); }}
      />
    </div>
  );
}
