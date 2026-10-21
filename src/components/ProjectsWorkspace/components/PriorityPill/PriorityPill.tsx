import type { Project } from '@/types/project';
import { priorityMeta } from '../../project-card-meta';

export function PriorityPill({ priority }: { priority: Project['priority'] }) {
  const meta = priorityMeta[priority];

  return (
    <span className={`inline-flex h-6 items-center rounded-md border px-2 text-xs font-semibold ${meta.pill}`}>
      {meta.label}
    </span>
  );
}
