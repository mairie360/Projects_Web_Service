import React from 'react';
import { Button, PriorityPill, TagList } from '@mairie360/lib-components/primitives';
import { ChevronLeft, Pencil, Plus } from 'lucide-react';

import { getProjectNumber } from '../../../../project-card-meta';
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

/** MAIR-846 (Figma F5 5.2): breadcrumb « ← Projets / #12 », status, priority, labels, title, description and the actions. */
export const ProjectPageHeader = ({
  project, titleId, titleRef, backDisabled = false, onBack, onChangeStatus, statusDisabled, onEdit, editDisabled = false, onNewTask,
  onDuplicate, duplicateDisabled, duplicateLabel, onDelete,
}: ProjectPageHeaderProps) => (
  <header className="space-y-3">
    <nav aria-label="Fil d’Ariane" className="flex items-center gap-1 text-sm text-[var(--mairie-text-muted)]">
      <Button variant="ghost" tone="neutral" size="s" icon={ChevronLeft} label="Projets" disabled={backDisabled} onClick={onBack} />
      <span aria-hidden>/</span>
      <span aria-current="page">{getProjectNumber(project)}</span>
    </nav>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <ProjectStatusMenu status={project.status} onChange={onChangeStatus} disabled={statusDisabled} />
          <PriorityPill level={project.priority} />
          {project.labels.length > 0 && <TagList label="Étiquettes du projet" items={project.labels} size="s" />}
        </div>
        <h1 id={titleId} ref={titleRef} tabIndex={-1} className="text-2xl font-semibold leading-tight text-[var(--mairie-text)] outline-none">{project.title}</h1>
        {project.description && <p className="max-w-3xl text-sm text-[var(--mairie-text-muted)]">{project.description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {onEdit && <Button variant="outline" tone="neutral" icon={Pencil} label="Modifier" disabled={editDisabled} onClick={onEdit} />}
        {onNewTask && <Button variant="solid" tone="primary" icon={Plus} label="Nouvelle tâche" onClick={onNewTask} />}
        <ProjectMoreMenu title={project.title} onEdit={onEdit} editDisabled={editDisabled} onDuplicate={onDuplicate} duplicateDisabled={duplicateDisabled} duplicateLabel={duplicateLabel} onDelete={onDelete} />
      </div>
    </div>
  </header>
);
