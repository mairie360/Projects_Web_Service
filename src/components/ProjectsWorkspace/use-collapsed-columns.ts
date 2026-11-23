import React from 'react';

/** MAIR-1134: browser keys of the folded columns of the projects Kanban and of the task board. */
export const COLLAPSED_PROJECT_COLUMNS_KEY = 'm360-collapsed-projects';
export const COLLAPSED_TASK_COLUMNS_KEY = 'm360-collapsed-tasks';

function readCollapsed(key: string): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * The folded columns of a board, remembered per browser (MAIR-1134). Storage may be unavailable (private window,
 * blocked site data): the board then folds for the current page only. Read after mount, so the server markup and
 * the first client render agree.
 */
export function useCollapsedColumns(storageKey: string) {
  const [collapsed, setCollapsed] = React.useState<ReadonlySet<string>>(() => new Set());
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = readCollapsed(storageKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is only read after mount (hydration)
    if (stored.length) setCollapsed(new Set(stored));
  }, [storageKey]);

  const setColumnCollapsed = React.useCallback((column: string, folded: boolean) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (folded) next.add(column);
      else next.delete(column);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // Not remembered: the fold still applies to this page.
      }
      return next;
    });
  }, [storageKey]);

  return { collapsed, setColumnCollapsed };
}
