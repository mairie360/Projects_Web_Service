import { DateTime, Pagination, Panel } from '@mairie360/lib-components/primitives';
import { Activity } from 'lucide-react';

import type { ActivityItem } from '@/types/project';
import { describeActivity } from '../../activity-text';
import { ProjectCommentForm } from './components/ProjectCommentForm';

export interface ProjectActivityTabProps {
  items: ActivityItem[];
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;
  error?: string;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  /** Without it (a project the caller may not comment), no composer. */
  onPublish?: (message: string) => Promise<boolean>;
  publishing?: boolean;
  publishError?: string;
}

/**
 * MAIR-874 (C3, Figma F10) « Activité »: the comment composer, then the whole history of the project — its comments and
 * the changes of its tasks, newest first — page by page.
 */
export const ProjectActivityTab = ({ items, page, pageSize, total, loading, error, onRetry, onPageChange, onPublish, publishing = false, publishError }: ProjectActivityTabProps) => (
  <div className="space-y-6">
    {onPublish && (
      <Panel title="Commenter le projet">
        <ProjectCommentForm onPublish={onPublish} pending={publishing} error={publishError} />
      </Panel>
    )}
    <Panel
      title="Historique"
      description={total ? `${total} entrée${total > 1 ? 's' : ''}` : undefined}
      icon={Activity}
      state={error ? 'unavailable' : loading ? 'loading' : items.length ? 'default' : 'empty'}
      stateProps={error
        ? { title: 'Activité indisponible', description: error, onRetry }
        : loading ? { title: 'Chargement de l’activité' } : { title: 'Aucune activité', description: 'Les commentaires et les changements des tâches du projet apparaîtront ici.' }}
    >
      <div className="space-y-4">
        <ol className="space-y-4" aria-label="Activité du projet">
          {items.map((item) => {
            const { action, detail } = describeActivity(item);
            return (
              <li key={item.id} className="border-l-2 border-[var(--mairie-border)] pl-3">
                <p className="text-sm font-medium text-[var(--mairie-text)]">{action}</p>
                {detail && <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-[var(--mairie-text-muted)]">{detail}</p>}
                <DateTime value={item.createdAt} format="medium" size="s" tone="muted" />
              </li>
            );
          })}
        </ol>
        {total > pageSize && <Pagination page={page} pageSize={pageSize} total={total} itemsLabel="entrées" label="Pages de l’activité" loading={loading} onChange={onPageChange} />}
      </div>
    </Panel>
  </div>
);
