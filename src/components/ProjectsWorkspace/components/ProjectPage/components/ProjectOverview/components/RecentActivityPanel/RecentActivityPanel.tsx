import { Button, DateTime, Panel } from '@mairie360/lib-components/primitives';
import { Activity } from 'lucide-react';

import type { ActivityItem } from '@/types/project';
import { describeActivity } from '../../../../activity-text';

export interface RecentActivityPanelProps {
  items: ActivityItem[];
  loading: boolean;
  error?: string;
  onRetry: () => void;
  onShowAll: () => void;
}

/** MAIR-846 (C6) / MAIR-1089 « Activité récente »: the latest comments and task changes of the project. */
export const RecentActivityPanel = ({ items, loading, error, onRetry, onShowAll }: RecentActivityPanelProps) => (
  <Panel
    title="Activité récente"
    icon={Activity}
    action={<Button variant="outline" tone="neutral" size="s" label="Tout voir" onClick={onShowAll} />}
    state={error ? 'unavailable' : loading ? 'loading' : items.length ? 'default' : 'empty'}
    stateProps={error
      ? { title: 'Activité indisponible', description: error, onRetry }
      : loading ? { title: 'Chargement de l’activité' } : { title: 'Aucune activité', description: 'Les commentaires et les changements des tâches du projet apparaîtront ici.' }}
  >
    <ol className="space-y-3" aria-label="Dernières activités du projet">
      {items.map((item) => {
        const { action, detail } = describeActivity(item);
        return (
          <li key={item.id} className="border-l-2 border-[var(--mairie-border)] pl-3">
            <p className="text-sm font-medium text-[var(--mairie-text)]">{action}</p>
            {detail && <p className="mt-0.5 break-words text-sm text-[var(--mairie-text-muted)]">{detail}</p>}
            <DateTime value={item.createdAt} format="relative" size="s" tone="muted" />
          </li>
        );
      })}
    </ol>
  </Panel>
);
