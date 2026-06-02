'use client';

import React from 'react';
import { Avatar, ToolTip } from '@mairie360/lib-components';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  Eye,
  ListChecks,
  MoreHorizontal,
  Tag,
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
    className: 'border-[#d0d7de] bg-[#f6f8fa] text-[#57606a]',
    iconClassName: 'text-[#57606a]',
  },
  'in-progress': {
    label: 'En cours',
    icon: Clock3,
    className: 'border-[#bfdbfe] bg-[#ddf4ff] text-[#0969da]',
    iconClassName: 'text-[#0969da]',
  },
  review: {
    label: 'En révision',
    icon: Eye,
    className: 'border-[#ffd8b5] bg-[#fff8c5] text-[#9a6700]',
    iconClassName: 'text-[#9a6700]',
  },
  done: {
    label: 'Terminé',
    icon: CheckCircle2,
    className: 'border-[#aceebb] bg-[#dafbe1] text-[#1a7f37]',
    iconClassName: 'text-[#1a7f37]',
  },
};

const priorityMeta: Record<Project['priority'], { label: string; text: string; dot: string; pill: string }> = {
  high: {
    label: 'Haute',
    text: 'text-[#cf222e]',
    dot: 'bg-[#cf222e] border-[#cf222e]',
    pill: 'border-[#ffebe9] bg-[#ffebe9] text-[#cf222e]',
  },
  medium: {
    label: 'Moyenne',
    text: 'text-[#8250df]',
    dot: 'bg-[#8250df] border-[#8250df]',
    pill: 'border-[#f1e5ff] bg-[#f1e5ff] text-[#8250df]',
  },
  low: {
    label: 'Basse',
    text: 'text-[#57606a]',
    dot: 'bg-[#8c959f] border-[#8c959f]',
    pill: 'border-[#d8dee4] bg-[#f6f8fa] text-[#57606a]',
  },
};

const labelStyles = [
  'border-[#bfdbfe] bg-[#ddf4ff] text-[#0969da]',
  'border-[#aceebb] bg-[#dafbe1] text-[#1a7f37]',
  'border-[#ffd8b5] bg-[#fff1e5] text-[#9a6700]',
  'border-[#ffcecb] bg-[#ffebe9] text-[#cf222e]',
  'border-[#e2d4ff] bg-[#f1e5ff] text-[#8250df]',
];

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

function getProjectNumber(project: Project) {
  const numericId = Number(project.id);
  if (Number.isFinite(numericId)) return `#${numericId}`;

  return `#${project.id.replace(/\D/g, '').slice(-4) || '1'}`;
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

function ProjectLabels({ labels }: { labels: string[] }) {
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

function AvatarStack({ project }: { project: Project }) {
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
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#57606a] transition hover:bg-[#f6f8fa] hover:text-[#24292f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da]/30"
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
          className="absolute right-0 top-[calc(100%+4px)] z-50 w-36 overflow-hidden rounded-md border border-[#d0d7de] bg-white py-1 text-sm text-[#24292f] shadow-[0_8px_24px_rgba(140,149,159,0.2)]"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="flex h-9 w-full items-center px-3 text-left transition hover:bg-[#0969da] hover:text-white"
            onClick={runAction(onEdit)}
          >
            Modifier
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex h-9 w-full items-center px-3 text-left transition hover:bg-[#0969da] hover:text-white"
            onClick={runAction(onDuplicate)}
          >
            Dupliquer
          </button>
          <div className="my-1 border-t border-[#d8dee4]" />
          <button
            type="button"
            role="menuitem"
            className="flex h-9 w-full items-center px-3 text-left text-[#cf222e] transition hover:bg-[#ffebe9]"
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
    </article>
  );
}

function GridProjectCard({ project, onOpen, onEdit, onDuplicate, onDelete }: ProjectCardProps) {
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
    </article>
  );
}

export function ProjectCard({ variant = 'kanban', ...props }: ProjectCardProps) {
  if (variant === 'grid') {
    return <GridProjectCard {...props} />;
  }

  return <KanbanProjectCard {...props} />;
}
