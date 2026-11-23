import React from 'react';
import { Button, DateField, TextField } from '@mairie360/lib-components/primitives';
import { NO_MARKUP_HINT, NO_MARKUP_PATTERN } from '@/lib/text-constraints';

export interface MilestoneFormProps {
  /** Ids of the fields, unique per form on the page. */
  idPrefix: string;
  initial?: { title: string; dueDate: string };
  submitLabel: string;
  pending?: boolean;
  onSubmit: (value: { title: string; dueDate: string }) => void | Promise<unknown>;
  onCancel: () => void;
}

const MARKUP = /[<>]/;

/** MAIR-1086: title and day of a milestone; Échap cancels. The BFF checks the day too (a 30 February is a 400). */
export const MilestoneForm = ({ idPrefix, initial, submitLabel, pending = false, onSubmit, onCancel }: MilestoneFormProps) => {
  const [title, setTitle] = React.useState(initial?.title ?? '');
  const [dueDate, setDueDate] = React.useState(initial?.dueDate ?? '');
  const [errors, setErrors] = React.useState<{ title?: string; dueDate?: string }>({});
  const titleRef = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => { titleRef.current?.focus(); }, []);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const next: { title?: string; dueDate?: string } = {};
    if (!title.trim()) next.title = 'Donnez un titre au jalon.';
    else if (MARKUP.test(title)) next.title = 'Le titre ne doit pas contenir les caractères < ou >.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) next.dueDate = 'Choisissez la date du jalon.';
    setErrors(next);
    if (next.title) document.getElementById(`${idPrefix}-title`)?.focus();
    else if (next.dueDate) document.getElementById(`${idPrefix}-date`)?.focus();
    if (next.title || next.dueDate) return;
    void onSubmit({ title: title.trim(), dueDate });
  };

  return (
    <form
      noValidate
      aria-label={submitLabel}
      aria-busy={pending}
      className="space-y-3 rounded-[var(--mairie-radius-m,8px)] border border-[var(--mairie-border)] p-3"
      onSubmit={submit}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onCancel(); } }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <TextField ref={titleRef} id={`${idPrefix}-title`} label="Titre du jalon" required value={title} maxLength={255} pattern={NO_MARKUP_PATTERN} title={NO_MARKUP_HINT} error={errors.title} disabled={pending} onChange={(event) => setTitle(event.target.value)} />
        <DateField id={`${idPrefix}-date`} label="Date" required value={dueDate} error={errors.dueDate} disabled={pending} onChange={(event) => setDueDate(event.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" tone="neutral" size="s" type="button" label="Annuler" disabled={pending} onClick={onCancel} />
        <Button variant="solid" tone="primary" size="s" type="submit" label={submitLabel} loading={pending} />
      </div>
    </form>
  );
};
