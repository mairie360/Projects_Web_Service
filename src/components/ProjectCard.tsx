'use client';

import React from 'react';
import { Avatar, ToolTip } from '@mairie360/lib-components';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  MoreHorizontal,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { Project } from '../types/project';

type ProjectCardVariant = 'kanban' | 'grid';

type ProjectCardProps = {
  project: Project;
  variant?: ProjectCardVariant;
  onOpen?: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDuplicate?: (project: Project) => void;
  onDelete?: (project: Project) => void;
};

type StatusMeta = {
  label: string;
  icon: LucideIcon;
  className: string;
  iconClassName: string;
};

const statusMeta: Record<Project['status'], StatusMeta> = {
  todo: {
    label: 'À faire',
    icon: AlertCircle,
    className: 'border-[#ffb5bd] bg-[#fff1f2] text-[#e60012]',
    iconClassName: 'text-[#e60012]',
  },
  'in-progress': {
    label: 'En cours',
    icon: Clock3,
    className: 'border-[#8fc8e7] bg-[#dceff8] text-[#1256a6]',
    iconClassName: 'text-[#1256a6]',
  },
  review: {
    label: 'En révision',
    icon: Eye,
    className: 'border-[#8fc8e7] bg-[#dceff8] text-[#1256a6]',
    iconClassName: 'text-[#1256a6]',
  },
  done: {
    label: 'Terminé',
    icon: CheckCircle2,
    className: 'border-[#98dfad] bg-[#e9fbef] text-[#00a94f]',
    iconClassName: 'text-[#00a94f]',
  },
};

const priorityMeta: Record<Project['priority'], { label: string; text: string; dot: string; pill: string }> = {
  high: {
    label: 'Haute',
    text: 'text-[#e60012]',
    dot: 'bg-[#e60012] border-[#e60012]',
    pill: 'border-[#ff6b74] bg-[#fff7f7] text-[#e60012]',
  },
  medium: {
    label: 'Moyenne',
    text: 'text-[#3f908b]',
    dot: 'bg-[#4b908d] border-[#4b908d]',
    pill: 'border-[#4b908d] bg-[#e1f1f0] text-[#3f908b]',
  },
  low: {
    label: 'Basse',
    text: 'text-[#5d5d5d]',
    dot: 'bg-[#d8d4cf] border-[#d8d4cf]',
    pill: 'border-[#d8d4cf] bg-[#efeeeb] text-[#5d5d5d]',
  },
};

const labelStyles = ['bg-[#1256a6] text-white', 'bg-[#4b908d] text-white', 'bg-[#2f3438] text-white'];

export function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function formatProjectDate(date: string, withYear = true) {
  const [year, month, day] = date.split('-');
  return withYear ? `${day}/${month}/${year}` : `${day}/${month}`;
}

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
      className={`!h-6 !w-6 border border-white shadow-sm ${className}`}
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
        <div className="mb-2 flex items-center justify-between text-xs text-[#4c5965]">
          <span>Progression</span>
          <span className="font-semibold text-[#22272d]">{value}%</span>
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-[#cfdbed] ${compact ? 'h-1.5' : 'h-2'}`}>
        <div className="h-full rounded-full bg-[#1256a6]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ProjectLabels({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.slice(0, 2).map((label, index) => (
        <span
          key={label}
          className={`rounded-md px-2 py-1 text-xs font-semibold leading-none ${labelStyles[index % labelStyles.length]}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function AvatarStack({ project }: { project: Project }) {
  return (
    <div className="flex -space-x-1.5">
      {project.assignees.slice(0, 3).map((assignee) => (
        <PersonAvatar key={assignee.name} name={assignee.name} />
      ))}
      {project.assignees.length > 3 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#ece9e4] text-[10px] font-semibold text-[#4c5258]">
          +{project.assignees.length - 3}
        </span>
      )}
    </div>
  );
}

export function ProjectActionsMenu({
  project,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  project: Project;
  onEdit?: (project: Project) => void;
  onDuplicate?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const runAction = (action?: (project: Project) => void) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen(false);
    action?.(project);
  };

  return (
    <div
      ref={menuRef}
      className="relative shrink-0"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <ToolTip text="Actions">
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#343a40] transition hover:bg-[#f1efeb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4b908d]/30"
          aria-label={`Actions pour ${project.title}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((current) => !current);
          }}
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </ToolTip>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+4px)] z-50 w-36 overflow-hidden rounded-md border border-[#d9d5d0] bg-white py-1 text-sm text-[#2f3438] shadow-[0_8px_20px_rgba(28,31,35,0.16)]"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="flex h-9 w-full items-center px-3 text-left transition hover:bg-[#f6f4f1]"
            onClick={runAction(onEdit)}
          >
            Modifier
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex h-9 w-full items-center px-3 text-left transition hover:bg-[#f6f4f1]"
            onClick={runAction(onDuplicate)}
          >
            Dupliquer
          </button>
          <div className="my-1 border-t border-[#e3e0dc]" />
          <button
            type="button"
            role="menuitem"
            className="flex h-9 w-full items-center px-3 text-left text-[#e60012] transition hover:bg-[#fff1f2]"
            onClick={runAction(onDelete)}
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

function KanbanProjectCard({ project, onOpen, onEdit, onDuplicate, onDelete }: ProjectCardProps) {
  return (
    <article
      className="min-h-[218px] cursor-pointer rounded-lg border border-[#d9d5d0] bg-white p-4 shadow-[0_1px_3px_rgba(30,30,30,0.18)] transition hover:border-[#b9d6d5] hover:shadow-[0_5px_14px_rgba(30,30,30,0.14)]"
      onClick={() => onOpen?.(project)}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-[#172033]">{project.title}</h3>
        <ProjectActionsMenu project={project} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
      </div>

      <p className="mb-3 line-clamp-2 min-h-9 text-xs leading-relaxed text-[#536171]">{project.description}</p>

      <div className="mb-4">
        <ProjectLabels labels={project.labels} />
      </div>

      <div className="mb-3">
        <ProgressMeter value={project.progress} compact />
      </div>

      <div className="mb-3 flex items-center justify-between gap-3 text-xs text-[#536171]">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.8} />
          {project.tasks.completed}/{project.tasks.total} tâches
        </span>
        <PriorityLabel priority={project.priority} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <AvatarStack project={project} />
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#e60012]">
          <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.8} />
          {formatProjectDate(project.dueDate, false)}
        </span>
      </div>
    </article>
  );
}

function GridProjectCard({ project, onOpen, onEdit, onDuplicate, onDelete }: ProjectCardProps) {
  return (
    <article
      className="min-h-[274px] cursor-pointer rounded-lg border border-[#d9d5d0] bg-white p-6 shadow-sm transition hover:border-[#b9d6d5] hover:shadow-[0_5px_14px_rgba(30,30,30,0.12)]"
      onClick={() => onOpen?.(project)}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <h3 className="min-w-0 text-lg font-medium leading-snug text-[#172033]">{project.title}</h3>
        <div className="flex shrink-0 items-center gap-1">
          <StatusPill status={project.status} />
          <ProjectActionsMenu project={project} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
        </div>
      </div>

      <p className="mb-8 line-clamp-2 min-h-12 text-sm leading-relaxed text-[#536171]">{project.description}</p>

      <div className="mb-4">
        <ProgressMeter value={project.progress} />
      </div>

      <div className="mb-5 flex items-center justify-between gap-4 text-sm text-[#3f4750]">
        <span className="inline-flex min-w-0 items-center gap-2">
          <PersonAvatar name={project.responsible.name} className="shrink-0" />
          <span className="truncate">{project.responsible.name}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[#4c5258]">
          <Users className="h-4 w-4" strokeWidth={1.7} />
          {project.assignees.length}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 text-sm">
        <span className={priorityMeta[project.priority].text}>Priorité {priorityMeta[project.priority].label}</span>
        <span className="text-[#68717b]">Échéance: {formatProjectDate(project.dueDate)}</span>
      </div>
    </article>
  );
}

export function ProjectCard({ variant = 'kanban', ...props }: ProjectCardProps) {
  if (variant === 'grid') {
    return <GridProjectCard {...props} />;
  }

  return <KanbanProjectCard {...props} />;
}
