import React from 'react';
import { Button, PriorityPill, StatusPill, UserIdentity } from '@mairie360/lib-components/primitives';
import { CalendarDays, ChevronLeft, Pencil, Plus } from 'lucide-react';

import { formatProjectDate, getProjectNumber, isProjectOverdue } from '../../../../project-card-meta';
import { projectMessageHref } from '@/lib/project-message-url';
import type { Project } from '@/types/project';
import { ProjectMoreMenu } from './components/ProjectMoreMenu';
import { ProjectStatusMenu } from './components/ProjectStatusMenu';

export interface ProjectPageHeaderProps {
  project: Project;
  titleId: string;
  titleRef?: React.Ref<HTMLHeadingElement>;
  backDisabled?: boolean;
  onBack: () => void;
  onChangeStatus?: (status: Project['status']) => void;
  statusDisabled?: boolean;
  onEdit?: () => void;
  editDisabled?: boolean;
  onNewTask?: () => void;
  onDuplicate?: () => void;
  duplicateDisabled?: boolean;
  duplicateLabel?: string;
  onDelete?: () => void;
}

/**
 * MAIR-846 (Figma F5 5.2), harmonised by MAIR-1135 (C4): breadcrumb « ← Projets / #12 », then the title first, a meta
 * line — status (clickable, with its chevron), priority, « En retard », separator, responsible, due date — and the
 * description; on the right three size m actions: « Modifier » (outline), « Nouvelle tâche » (solid), « … ». The labels
 * moved to « Informations ».
 */
export const ProjectPageHeader = ({
  project, titleId, titleRef, backDisabled = false, onBack, onChangeStatus, statusDisabled, onEdit, editDisabled = false, onNewTask,
  onDuplicate, duplicateDisabled, duplicateLabel, onDelete,
}: ProjectPageHeaderProps) => (
  <header className="space-y-4">
    <nav aria-label="Fil d’Ariane" className="flex items-center gap-1 text-sm text-[var(--mairie-text-muted)]">
      <Button variant="ghost" tone="neutral" size="s" icon={ChevronLeft} label="Projets" disabled={backDisabled} onClick={onBack} />
      <span aria-hidden>/</span>
      <span aria-current="page">{getProjectNumber(project)}</span>
    </nav>
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 flex-1 space-y-3">
        <h1 id={titleId} ref={titleRef} tabIndex={-1} className="text-2xl font-semibold leading-tight text-[var(--mairie-text)] outline-none [overflow-wrap:anywhere]">{project.title}</h1>
        <div className="flex flex-wrap items-center gap-2" aria-label="Résumé du projet" role="group">
          <ProjectStatusMenu status={project.status} onChange={onChangeStatus} disabled={statusDisabled} />
          <PriorityPill level={project.priority} />
          {isProjectOverdue(project) && <StatusPill label="En retard" tone="danger" dot />}
          <span aria-hidden className="mx-1 h-5 w-px bg-[var(--mairie-border)]" />
          {project.responsible.name && <UserIdentity name={project.responsible.name} variant="nameOnly" size="s" />}
          {project.dueDate && (
            <span className="inline-flex items-center gap-1.5 text-sm text-[var(--mairie-text-muted)]">
              <CalendarDays aria-hidden className="h-4 w-4" />
              <span className="sr-only">Échéance :</span>
              {formatProjectDate(project.dueDate)}
            </span>
          )}
        </div>
        {project.description && <p className="max-w-3xl text-sm text-[var(--mairie-text-muted)]">{project.description}</p>}
      </div>
      <div className="flex w-full shrink-0 items-center gap-2 md:w-auto [&>button]:flex-1 md:[&>button]:flex-none">
        {onEdit && <Button variant="outline" tone="neutral" size="m" icon={Pencil} label="Modifier" disabled={editDisabled} onClick={onEdit} />}
        {onNewTask && <Button variant="solid" tone="primary" size="m" icon={Plus} label="Nouvelle tâche" onClick={onNewTask} />}
        <ProjectMoreMenu title={project.title} onEdit={onEdit} editDisabled={editDisabled} onDuplicate={onDuplicate} duplicateDisabled={duplicateDisabled} duplicateLabel={duplicateLabel} messageHref={projectMessageHref(project.id)} onDelete={onDelete} />
      </div>
    </div>
  </header>
);
