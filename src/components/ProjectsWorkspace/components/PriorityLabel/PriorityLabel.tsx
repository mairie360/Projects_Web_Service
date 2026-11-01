import type { Project } from '@/types/project';
import { priorityMeta } from '../../project-card-meta';

export function PriorityLabel({ priority }: { priority: Project['priority'] }) {
  const meta = priorityMeta[priority];

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${meta.text}`}>
      <span className={`h-2 w-2 rounded-full border ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
