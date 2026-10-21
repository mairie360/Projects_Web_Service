import type { Project } from '@/types/project';
import { statusMeta } from '../../project-card-meta';

export function StatusPill({ status }: { status: Project['status'] }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs font-semibold leading-none ${meta.className}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {meta.label}
    </span>
  );
}
