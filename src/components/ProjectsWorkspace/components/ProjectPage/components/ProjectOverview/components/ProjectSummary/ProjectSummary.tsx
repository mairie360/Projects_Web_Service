import { AvatarStack, DescriptionList, PriorityPill, ProgressMeter, StatusPill, TagList, UserIdentity } from '@mairie360/lib-components/primitives';
import { CalendarDays } from 'lucide-react';
import type React from 'react';

import { formatLongDate } from '../../../ProjectMetrics';
import { formatBudget } from '@/lib/projectBudget';
import type { Project, ProjectMemberRole } from '@/types/project';

/** MAIR-1088: French name of a member's role in the project. */
export const MEMBER_ROLE_LABELS: Record<ProjectMemberRole, string> = { manager: 'Responsable', contributor: 'Contributeur', reader: 'Lecteur' };

const Budget = ({ project }: { project: Project }) => {
  const voted = project.budgetVoted ?? null;
  const committed = project.budgetCommitted ?? null;
  if (voted === null && committed === null) return <span className="text-[var(--mairie-text-muted)]">Non renseigné</span>;
  return (
    <span className="flex flex-col">
      <span className="font-medium text-[var(--mairie-text)]">{voted === null ? 'Voté : non renseigné' : `${formatBudget(voted)} votés`}</span>
      <span className="text-xs text-[var(--mairie-text-muted)]">{committed === null ? 'Engagé : non renseigné' : `${formatBudget(committed)} engagés`}</span>
    </span>
  );
};

const Day = ({ date }: { date: string }) => (
  <span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden className="h-4 w-4 text-[var(--mairie-text-muted)]" />{formatLongDate(date)}</span>
);

/**
 * MAIR-846 (C6, Figma F5 5.2 / 5.11) « Informations »: responsible, dates, priority, team, group, labels (MAIR-1135) and budget.
 * A project without group (created before groups, or whose group was deleted) gets the « Sans groupe » warning.
 */
export const ProjectSummary = ({ project }: { project: Project }) => {
  const team = [project.responsible, ...project.assignees].filter((person, index, people) => person.name && people.findIndex((other) => (other.id ?? other.name) === (person.id ?? person.name)) === index);
  const items: { id: string; label: string; value: React.ReactNode }[] = [
    { id: 'responsible', label: 'Responsable', value: project.responsible.name ? <UserIdentity name={project.responsible.name} variant="nameOnly" size="s" /> : 'Non renseigné' },
    { id: 'start', label: 'Début', value: <Day date={(project.createdAt ?? '').slice(0, 10)} /> },
    { id: 'due', label: 'Échéance', value: <Day date={project.dueDate} /> },
    { id: 'priority', label: 'Priorité', value: <PriorityPill level={project.priority} /> },
    { id: 'team', label: 'Équipe', value: team.length ? <AvatarStack label="Équipe du projet" people={team.map((person) => ({ name: person.name }))} max={3} size="s" /> : 'Aucun membre' },
    {
      id: 'group',
      label: 'Groupe',
      value: project.group
        ? <span className="font-medium text-[var(--mairie-text)]">{project.group.name}</span>
        : (
          <span className="flex flex-col items-start gap-1">
            <StatusPill label="Sans groupe" tone="warning" dot />
            <span className="text-xs text-[var(--mairie-text-muted)]">Choisissez un groupe dans « Modifier »</span>
          </span>
        ),
    },
    // MAIR-1135 (C5): the labels left the header for « Informations ».
    { id: 'labels', label: 'Étiquettes', value: project.labels.length ? <TagList label="Étiquettes du projet" items={project.labels} size="s" /> : <span className="text-[var(--mairie-text-muted)]">Aucune</span> },
    // MAIR-1085: the voted and committed budgets, in euros.
    { id: 'budget', label: 'Budget', value: <Budget project={project} /> },
    // MAIR-1088: the caller's role in the project, when they are a member.
    ...(project.myRole ? [{ id: 'my-role', label: 'Votre rôle', value: <span className="font-medium text-[var(--mairie-text)]">{MEMBER_ROLE_LABELS[project.myRole]}</span> }] : []),
  ];
  return (
    <div className="space-y-4">
      <DescriptionList items={items} labelWidth={110} />
      <ProgressMeter label="Avancement" value={project.progress} />
    </div>
  );
};
