import { Avatar, Button, Checkbox, Panel, PriorityPill } from '@mairie360/lib-components/primitives';
import { CalendarDays } from 'lucide-react';

import { formatLongDate } from '../../../ProjectMetrics';
import type { ProjectTask } from '@/types/project';

/** The open tasks closest to their due date (dated ones first), at most `limit`. */
export function nextOpenTasks(tasks: ProjectTask[], limit = 3) {
  const key = (task: ProjectTask) => (/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ? task.dueDate : '9999-99-99');
  return tasks
    .filter((task) => !task.completed && task.status !== 'done')
    .sort((a, b) => key(a).localeCompare(key(b)) || a.title.localeCompare(b.title, 'fr'))
    .slice(0, limit);
}

export interface NextTasksPanelProps {
  tasks: ProjectTask[];
  pendingTaskIds?: ReadonlySet<string>;
  disabled?: boolean;
  onComplete: (task: ProjectTask) => void;
  onShowAll: () => void;
}

/** MAIR-846 (C6, Figma F5 5.2 / 5.3) « Prochaines tâches »: checking a task marks it done. */
export const NextTasksPanel = ({ tasks, pendingTaskIds, disabled = false, onComplete, onShowAll }: NextTasksPanelProps) => {
  const next = nextOpenTasks(tasks);
  return (
    <Panel
      title="Prochaines tâches"
      description="Les tâches ouvertes les plus proches de leur échéance"
      action={<Button variant="outline" tone="neutral" size="s" label="Toutes les tâches" onClick={onShowAll} />}
      state={next.length ? 'default' : 'empty'}
      stateProps={{ title: 'Aucune tâche ouverte', description: 'Toutes les tâches du projet sont terminées.' }}
    >
      <ul className="space-y-2">
        {next.map((task) => {
          const locked = disabled || pendingTaskIds?.has(task.id) || task.permissions?.canUpdateStatus === false;
          return (
            <li key={task.id} className="flex flex-wrap items-center gap-3 rounded-[var(--mairie-radius-m,8px)] bg-[var(--mairie-surface-muted,#f6f4f1)] px-3 py-2">
              <Checkbox label={task.title} checked={false} disabled={locked} aria-busy={pendingTaskIds?.has(task.id) || undefined} onChange={() => onComplete(task)} className="min-w-0 flex-1" />
              {/* MAIR-1135 (C5): only a high priority is worth the space here. */}
              {task.priority === 'high' && <PriorityPill level={task.priority} size="s" />}
              <span className="inline-flex items-center gap-1 text-sm text-[var(--mairie-text-muted)]"><CalendarDays aria-hidden className="h-4 w-4" />{formatLongDate(task.dueDate)}</span>
              {task.responsible.name && <Avatar alt={task.responsible.name} size="xs" />}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
};
