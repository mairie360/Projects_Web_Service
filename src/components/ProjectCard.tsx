'use client';

import { CalendarDays, CircleDot, ListChecks, Tag, Users } from 'lucide-react';

import {
  AvatarStack,
  PersonAvatar,
  PriorityLabel,
  PriorityPill,
  ProgressMeter,
  ProjectLabels,
  RecentTasks,
  StatusPill,
} from './project-card/ProjectCardParts';
import { formatProjectDate, getProjectNumber, statusMeta } from './project-card/projectCardMeta';
import { ProjectActionsMenu } from './project-card/ProjectActionsMenu';
import { TaskComposer } from './project-card/TaskComposer';
import type { ProjectCardProps } from './project-card/types';

export { ProjectActionsMenu } from './project-card/ProjectActionsMenu';
export { formatProjectDate, getInitials } from './project-card/projectCardMeta';
export { PersonAvatar, PriorityLabel, PriorityPill, ProgressMeter, StatusPill } from './project-card/ProjectCardParts';

function KanbanProjectCard({
  project,
  memberOptions,
  labelOptions,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
  onAddTask,
}: ProjectCardProps) {
  return (
    <article
      className="cursor-pointer rounded-md border border-[#d0d7de] bg-white p-3 shadow-sm transition hover:border-[#8c959f] hover:shadow-[0_3px_10px_rgba(140,149,159,0.18)]"
      onClick={() => onOpen?.(project)}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 gap-2">
          <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-[#1a7f37]" strokeWidth={2} />
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[#24292f]">{project.title}</h3>
            <p className="mt-1 truncate text-xs text-[#57606a]">Mairie360 / projets {getProjectNumber(project)}</p>
          </div>
        </div>
        <ProjectActionsMenu project={project} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
      </div>

      <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-[#57606a]">{project.description}</p>

      <div className="mb-4">
        <ProjectLabels labels={project.labels} />
      </div>

      <div className="mb-3" aria-label={`Progression ${project.progress}%`}>
        <ProgressMeter value={project.progress} compact />
      </div>

      <RecentTasks tasks={project.taskItems} />

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-[#57606a]">
        <span className="inline-flex min-w-0 items-center gap-1 truncate">
          <Tag className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          {statusMeta[project.status].label}
        </span>
        <PriorityLabel priority={project.priority} />
        <span className="inline-flex min-w-0 items-center gap-1 truncate">
          <ListChecks className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          {project.tasks.completed}/{project.tasks.total}
        </span>
        <span className="inline-flex min-w-0 items-center gap-1 truncate">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          {formatProjectDate(project.dueDate, false)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <AvatarStack project={project} />
        <span className="inline-flex items-center gap-1 text-xs text-[#57606a]">
          <Users className="h-3.5 w-3.5" strokeWidth={1.8} />
          {project.assignees.length}
        </span>
      </div>

      <TaskComposer project={project} memberOptions={memberOptions} labelOptions={labelOptions} onAddTask={onAddTask} />
    </article>
  );
}

function GridProjectCard({
  project,
  memberOptions,
  labelOptions,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
  onAddTask,
}: ProjectCardProps) {
  return (
    <article
      className="min-h-[232px] cursor-pointer rounded-md border border-[#d0d7de] bg-white p-5 shadow-sm transition hover:border-[#8c959f] hover:shadow-[0_3px_10px_rgba(140,149,159,0.18)]"
      onClick={() => onOpen?.(project)}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-2.5">
          <CircleDot className="mt-1 h-4 w-4 shrink-0 text-[#1a7f37]" strokeWidth={2} />
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[#24292f]">{project.title}</h3>
            <p className="mt-1 text-xs text-[#57606a]">Mairie360 / projets {getProjectNumber(project)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ProjectActionsMenu project={project} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
        </div>
      </div>

      <p className="mb-4 line-clamp-2 min-h-10 text-sm leading-relaxed text-[#57606a]">{project.description}</p>

      <div className="mb-4">
        <ProjectLabels labels={project.labels} />
      </div>

      <div className="mb-4">
        <ProgressMeter value={project.progress} />
      </div>

      <RecentTasks tasks={project.taskItems} />

      <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-[#57606a]">
        <StatusPill status={project.status} />
        <PriorityPill priority={project.priority} />
        <span className="inline-flex items-center gap-1">
          <ListChecks className="h-3.5 w-3.5" strokeWidth={1.8} />
          {project.tasks.completed}/{project.tasks.total} tâches
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.8} />
          {formatProjectDate(project.dueDate)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 text-sm text-[#57606a]">
        <span className="inline-flex min-w-0 items-center gap-2">
          <PersonAvatar name={project.responsible.name} className="shrink-0" />
          <span className="truncate">{project.responsible.name}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[#4c5258]">
          <Users className="h-4 w-4" strokeWidth={1.7} />
          {project.assignees.length}
        </span>
      </div>

      <TaskComposer project={project} memberOptions={memberOptions} labelOptions={labelOptions} onAddTask={onAddTask} />
    </article>
  );
}

export function ProjectCard({ variant = 'kanban', ...props }: ProjectCardProps) {
  if (variant === 'grid') {
    return <GridProjectCard {...props} />;
  }

  return <KanbanProjectCard {...props} />;
}
