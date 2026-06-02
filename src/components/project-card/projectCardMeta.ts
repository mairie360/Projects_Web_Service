import { AlertCircle, CheckCircle2, Clock3, Eye } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { Project } from '../../types/project';

type StatusMeta = {
  label: string;
  icon: LucideIcon;
  className: string;
  iconClassName: string;
};

export const statusMeta: Record<Project['status'], StatusMeta> = {
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

export const priorityMeta: Record<Project['priority'], { label: string; text: string; dot: string; pill: string }> = {
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

export const labelStyles = [
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

export function getProjectNumber(project: Project) {
  const numericId = Number(project.id);
  if (Number.isFinite(numericId)) return `#${numericId}`;

  return `#${project.id.replace(/\D/g, '').slice(-4) || '1'}`;
}

