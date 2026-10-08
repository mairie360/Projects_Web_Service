'use client';

import type { ProjectsPageResponse } from '../../lib/bffProjectClient';

export function ProjectPagination({ pagination, pending, stale, onChange }: {
  pagination: ProjectsPageResponse['pagination'];
  pending: boolean;
  stale: boolean;
  onChange: (direction: 'previous' | 'next') => Promise<void>;
}) {
  const disabled = pending || stale;
  const buttonClass = 'min-h-11 rounded-md border border-[#d0ccc7] bg-white px-4 text-sm font-semibold text-[#2f3438] hover:bg-[#f5f3f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4b908d] disabled:cursor-not-allowed disabled:opacity-50';
  return (
    <nav aria-label="Pagination des projets" aria-busy={pending} className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e3e0dc] pt-5">
      <div>
        <p role="status" className="text-sm font-medium text-[#536171]">{`Page ${pagination.page} · ${pagination.total} projets`}</p>
        {pending && <p className="mt-1 text-xs text-[#536171]">Chargement de la page demandée…</p>}
        {stale && <p className="mt-1 text-xs text-[#cf222e]">Dernière page confirmée — actualisation nécessaire.</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-label="Page précédente" disabled={disabled || pagination.page <= 1} onClick={() => void onChange('previous')} className={buttonClass}>Précédent</button>
        <button type="button" aria-label="Page suivante" disabled={disabled || !pagination.hasNextPage} onClick={() => void onChange('next')} className={buttonClass}>Suivant</button>
      </div>
    </nav>
  );
}
