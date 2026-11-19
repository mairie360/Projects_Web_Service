'use client';

import { Caption, Pagination } from '@mairie360/lib-components/primitives';
import type { ProjectsPageResponse } from '@/lib/bffProjectClient';

/** The lib Pagination (MAIR-828) driven by the BFF page DTO; a stale page keeps its controls disabled. */
export function ProjectPagination({ pagination, pending, stale, onChange }: {
  pagination: ProjectsPageResponse['pagination'];
  pending: boolean;
  stale: boolean;
  onChange: (direction: 'previous' | 'next') => Promise<void>;
}) {
  // The BFF answers `hasNextPage`; keep the next page reachable even when `total` lags behind it.
  const total = pagination.hasNextPage ? Math.max(pagination.total, pagination.page * pagination.limit + 1) : pagination.total;
  return (
    <div className="mt-6 border-t border-[var(--mairie-border)] pt-5">
      <Pagination
        label="Pagination des projets"
        page={pagination.page}
        pageSize={pagination.limit}
        total={total}
        itemsLabel="projets"
        loading={pending || stale}
        onChange={(page) => void onChange(page < pagination.page ? 'previous' : 'next')}
      />
      {pending && <Caption className="mt-1">Chargement de la page demandée…</Caption>}
      {stale && <Caption className="mt-1" tone="danger">Dernière page confirmée — actualisation nécessaire.</Caption>}
    </div>
  );
}
