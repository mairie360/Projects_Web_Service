import { BffProjectError } from './bffProjectClient';

// Text rules of the published BFF_Project contract (MAIR-514): every free text rendered by the fronts refuses `<`
// and `>` (`^[^<>]*$`), a task comment is 1 to 2 000 characters. The inputs carry them as HTML constraints so
// the browser refuses the value before the BFF does; a BFF 400 still lists its `error.details[]` per field.

/** HTML `pattern` equivalent to the contract's `^[^<>]*$` (the browser anchors it). */
export const NO_MARKUP_PATTERN = '[^<>]*';
export const NO_MARKUP_HINT = 'Les caractères < et > ne sont pas autorisés.';
export const COMMENT_MAX_LENGTH = 2000;

/** Custom validity for a `<textarea>` (which has no `pattern` attribute), or any field on change. */
export function reportMarkupValidity(target: { value: string; setCustomValidity?: (message: string) => void }) {
  target.setCustomValidity?.(/[<>]/.test(target.value) ? NO_MARKUP_HINT : '');
}

const FIELD_LABELS: Readonly<Record<string, string>> = {
  title: 'Titre',
  description: 'Description',
  message: 'Commentaire',
  responsibleId: 'Responsable',
  dueDate: 'Échéance',
  assigneeIds: 'Participants',
  labels: 'Étiquettes',
  taskItems: 'Tâches',
};

function translateDetail(message: string) {
  if (/Must not contain < or >/.test(message)) return 'ne doit pas contenir les caractères < ou >';
  const max = message.match(/at most (\d+) character|<=(\d+) characters/);
  if (max) return `${max[1] ?? max[2]} caractères maximum`;
  if (/at least 1 character|^Required$/.test(message)) return 'ne doit pas être vide';
  return message;
}

/** `body.taskItems.0.title` → `Tâches › Titre : ne doit pas contenir les caractères < ou >`. */
export function describeValidationDetail(detail: unknown): string | null {
  if (!detail || typeof detail !== 'object') return null;
  const { path, message } = detail as { path?: unknown; message?: unknown };
  if (typeof message !== 'string') return null;
  const fields = typeof path === 'string'
    ? path.split('.').filter((part) => part && part !== 'body' && !/^\d+$/.test(part)).map((part) => FIELD_LABELS[part] ?? part)
    : [];
  const text = translateDetail(message);
  return fields.length ? `${fields.join(' › ')} : ${text}` : text;
}

/** The BFF message followed by its validation details, for a 400 with `error.details[]`. */
export function describeBffProjectError(error: unknown, fallback: string): string {
  if (error instanceof BffProjectError && error.status === 400 && Array.isArray(error.details) && error.details.length > 0) {
    // Details that only repeat the BFF message point at fields without adding anything: keep that message.
    const informative = error.details.filter((detail) => (detail as { message?: unknown } | null)?.message !== error.message);
    const lines = [...new Set(informative.map(describeValidationDetail).filter((line): line is string => Boolean(line)))];
    if (lines.length) return `Vérifiez les champs signalés : ${lines.join(' ; ')}.`;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}
