'use client';

import { CalendarDays, CheckSquare2, Square } from 'lucide-react';
import type { ProjectTask } from '@/types/project';
import { formatProjectDate } from '../../../../project-card-meta';
import { PersonAvatar } from '../../../PersonAvatar';
import { PriorityPill } from '../../../PriorityPill';
import { StatusPill } from '../../../StatusPill';
import { TaskEditButton } from '../../../TaskEditButton';

export function DraftTaskRow({ task, onToggle, onEdit }: { task: ProjectTask; onToggle: () => void; onEdit: () => void }) {
  const TaskIcon = task.completed ? CheckSquare2 : Square;
  const people = task.assignees?.length ? task.assignees : [task.responsible];

  return (
    <article className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-3">
      <button
        type="button"
        className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-[#57606a] transition hover:bg-[#f6f8fa] hover:text-[#0969da] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da]/30"
        aria-label={task.completed ? `Marquer ${task.title} comme non terminée` : `Marquer ${task.title} comme terminée`}
        onClick={onToggle}
      >
        <TaskIcon
          className={`h-4 w-4 ${task.completed ? 'text-[#1a7f37]' : 'text-[#8c959f]'}`}
          strokeWidth={1.9}
        />
      </button>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-col items-start justify-between gap-2 sm:flex-row sm:gap-3">
          <h3 className="w-full min-w-0 text-sm font-semibold leading-snug text-[#24292f] [overflow-wrap:anywhere] sm:flex-1">{task.title}</h3>
          <TaskEditButton onClick={onEdit} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#57606a]">
          <StatusPill status={task.status} />
          <PriorityPill priority={task.priority} />
          <span className="inline-flex items-center gap-1">
            {people.slice(0, 3).map((assignee) => (
              <PersonAvatar key={assignee.name} name={assignee.name} />
            ))}
            {people.length > 3 && <span>+{people.length - 3}</span>}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.8} />
            {formatProjectDate(task.dueDate)}
          </span>
          {task.labels.map((label) => (
            <span
              key={label}
              className="inline-flex h-5 items-center rounded-full border border-[#d0d7de] bg-[#f6f8fa] px-2 text-[11px] font-semibold text-[#57606a]"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
