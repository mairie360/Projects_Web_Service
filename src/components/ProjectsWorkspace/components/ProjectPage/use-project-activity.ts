import React from 'react';
import { getBffProjectErrorMessage, getProjectActivity, type ProjectActivityPage } from '@/lib/bffProjectClient';

/**
 * MAIR-1089: one page of the project activity, read when the project opens and again after each confirmed change of
 * the project (`refreshKey`: a new detail), so a task write shows up. A newer read replaces an older one. Without
 * `projectId` (the detail is not in yet) nothing is read.
 */
export function useProjectActivity(projectId: string | null, refreshKey: unknown, { limit = 5 }: { limit?: number } = {}) {
  const [retry, setRetry] = React.useState(0);
  // One object per read: the answer is kept with the read it answers, so « loading » needs no state of its own.
  const request = React.useMemo(() => ({ projectId, refreshKey, retry }), [projectId, refreshKey, retry]);
  const [result, setResult] = React.useState<{ request: typeof request; page?: ProjectActivityPage; error?: string } | null>(null);
  const [shown, setShown] = React.useState<{ projectId: string; page: ProjectActivityPage } | null>(null);

  React.useEffect(() => {
    if (!request.projectId) return undefined;
    const controller = new AbortController();
    getProjectActivity(request.projectId, { page: 1, limit }, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        setResult({ request, page });
        setShown({ projectId: request.projectId as string, page });
      })
      .catch((failure) => { if (!controller.signal.aborted) setResult({ request, error: getBffProjectErrorMessage(failure) }); });
    return () => controller.abort();
  }, [request, limit]);

  // The previous page of the same project stays shown while it is read again.
  const page = shown && shown.projectId === projectId ? shown.page : null;
  const current = result?.request === request ? result : null;
  return {
    items: page?.items ?? [],
    total: page?.pagination.total ?? 0,
    loading: !page && !current,
    error: current?.error ?? '',
    retry: () => setRetry((value) => value + 1),
  };
}
