import type { SortDirection } from '@mairie360/lib-components/primitives';
import type { Project } from '@/types/project';

/** A sorted column of a lib `DataTable` (MAIR-1138): its key and direction. */
export type TableSort<Key extends string = string> = { key: Key; direction: SortDirection };

/** A cell value to sort on; `null`, `undefined` and `''` are empty. */
export type SortValue = string | number | null | undefined;

const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });
const isEmpty = (value: SortValue) => value === null || value === undefined || value === '';

/** Business orders (MAIR-1138): À faire < En cours < (En revue) < Terminé, Haute < Moyenne < Basse. */
export const STATUS_ORDER: readonly Project['status'][] = ['todo', 'in-progress', 'review', 'done'];
export const PRIORITY_ORDER: readonly Project['priority'][] = ['high', 'medium', 'low'];
export const statusRank = (status: Project['status']) => STATUS_ORDER.indexOf(status);
export const priorityRank = (priority: Project['priority']) => PRIORITY_ORDER.indexOf(priority);

/** A due date as `YYYY-MM-DD`, or empty when it is absent or not a date. */
export const sortableDate = (value: string) => (/^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : '');

/**
 * Client-side sort of a lib `DataTable` (MAIR-1138, shared by the projects table and the task list): 1st click
 * ascending, 2nd descending (the lib toggles), numbers compared as numbers, text in French order. Empty values stay
 * last whatever the direction; equal values keep their order (stable sort).
 */
export function sortRows<Row, Key extends string>(
  rows: readonly Row[],
  sort: TableSort<Key> | null | undefined,
  valueOf: Record<Key, (row: Row) => SortValue>,
): Row[] {
  if (!sort || !valueOf[sort.key]) return [...rows];
  const value = valueOf[sort.key];
  const factor = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((left, right) => {
    const a = value(left);
    const b = value(right);
    if (isEmpty(a) || isEmpty(b)) return isEmpty(a) === isEmpty(b) ? 0 : isEmpty(a) ? 1 : -1;
    return factor * (typeof a === 'number' && typeof b === 'number' ? a - b : collator.compare(String(a), String(b)));
  });
}
