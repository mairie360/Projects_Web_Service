import { Avatar } from '@mairie360/lib-components';
import { CheckSquare2, ListChecks, Square } from 'lucide-react';

import type { Project, ProjectTask } from '../../types/project';
import { getInitials, labelStyles, priorityMeta, statusMeta } from './projectCardMeta';

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

export function PriorityPill({ priority }: { priority: Project['priority'] }) {
  const meta = priorityMeta[priority];

  return (
    <span className={`inline-flex h-6 items-center rounded-md border px-2 text-xs font-semibold ${meta.pill}`}>
      {meta.label}
    </span>
  );
}

export function PriorityLabel({ priority }: { priority: Project['priority'] }) {
  const meta = priorityMeta[priority];

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${meta.text}`}>
      <span className={`h-2 w-2 rounded-full border ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function PersonAvatar({ name, className = '' }: { name: string; className?: string }) {
  return (
    <Avatar
      alt={name}
      fallback={<span className="text-[10px] font-semibold leading-none text-white">{getInitials(name)}</span>}
      className={`!h-5 !w-5 border border-white shadow-sm ${className}`}
    />
  );
}

export function ProgressMeter({
  value,
  showLabel = true,
  compact = false,
}: {
  value: number;
  showLabel?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-2 flex items-center justify-between text-xs text-[#57606a]">
          <span>Progression</span>
          <span className="font-semibold text-[#24292f]">{value}%</span>
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-[#d8dee4] ${compact ? 'h-1.5' : 'h-2'}`}>
        <div className="h-full rounded-full bg-[#0969da]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function ProjectLabels({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.slice(0, 2).map((label, index) => (
        <span
          key={label}
          className={`inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-semibold leading-none ${labelStyles[index % labelStyles.length]}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export function AvatarStack({ project }: { project: Project }) {
  return (
    <div className="flex -space-x-1.5">
      {project.assignees.slice(0, 3).map((assignee) => (
        <PersonAvatar key={assignee.name} name={assignee.name} />
      ))}
      {project.assignees.length > 3 && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#f6f8fa] text-[10px] font-semibold text-[#57606a]">
          +{project.assignees.length - 3}
        </span>
      )}
    </div>
  );
}

export function RecentTasks({ tasks }: { tasks?: ProjectTask[] }) {
  if (!tasks || tasks.length === 0) return null;

  const visibleTasks = tasks.slice(-2).reverse();

  return (
    <div className="mb-3 rounded-md border border-[#d8dee4] bg-[#f6f8fa] px-2.5 py-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#57606a]">
        <ListChecks className="h-3.5 w-3.5" strokeWidth={1.8} />
        Tâches récentes
      </div>
      <div className="space-y-1.5">
        {visibleTasks.map((task) => {
          const TaskIcon = task.completed ? CheckSquare2 : Square;

          return (
            <div key={task.id} className="flex items-center gap-1.5 text-xs text-[#57606a]">
              <TaskIcon
                className={`h-3.5 w-3.5 shrink-0 ${task.completed ? 'text-[#1a7f37]' : 'text-[#8c959f]'}`}
                strokeWidth={1.8}
              />
              <span className="min-w-0 flex-1 truncate text-[#24292f]">{task.title}</span>
              <span className="flex shrink-0 -space-x-1">
                {(task.assignees?.length ? task.assignees : [task.responsible]).slice(0, 2).map((assignee) => (
                  <PersonAvatar key={assignee.name} name={assignee.name} />
                ))}
              </span>
              <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#57606a]">
                {statusMeta[task.status].label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

