'use client';

import React from 'react';
import { Button, DescriptionList, Panel, PriorityPill, StatusPill, UserIdentity } from '@mairie360/lib-components/primitives';
import { ArrowLeft, Check, Pencil, RotateCcw } from 'lucide-react';

import { formatProjectDate, getProjectNumber } from '@/components/ProjectsWorkspace/project-card-meta';
import type { TaskCollaborationState } from '@/components/ProjectsWorkspace/components/ProjectPage/use-task-collaboration';
import type { TaskColumnStatus } from '@/components/ProjectsWorkspace/components/ProjectPage/use-detail-task-form';
import { taskAssignees } from '@/components/ProjectsWorkspace/components/ProjectPage/use-task-filters';
import type { Project, ProjectTask } from '@/types/project';
import { taskDelayLabel } from '../../task-board-model';
import { TaskActionsMenu, type TaskMenuColumn } from '../TaskActionsMenu';
import { useAnnouncedText } from '@/lib/use-announced-text';
import { TaskFollowUp } from './components/TaskFollowUp';

export interface TaskPageProps {
  task: ProjectTask;
  project: Project;
  column: TaskColumnStatus;
  columns: readonly TaskMenuColumn[];
  overdue: boolean;
  /** No write may start on it (pending, waiting for a verification read, another write running). */
  blocked: boolean;
  collaboration: TaskCollaborationState;
  onBack: () => void;
  /** Absent without the right to edit the task. */
  onEdit?: () => void;
  /** Absent without the right to change its state. */
  onMove?: (status: TaskColumnStatus) => void;
  onDuplicate?: () => void;
  /** Absent without the right to delete the task. */
  onDelete?: () => void;
}

/**
 * MAIR-1137 (C15, Figma F6 6.7 / 6.7b): the page of a task, on the base of the project page — breadcrumb, title, a
 * meta line (clickable state, priority, « En retard », assignee, due date), « Modifier », « Marquer comme terminée »
 * or « Rouvrir », « … »; the follow-up (comments and history) on the left, « Informations » on the right. A click on a
 * task opens this page, never the edit. « Description » shows the text of the task (line breaks kept), or « Aucune
 * description pour l’instant. » with « Ajouter une description » (the edit) for whoever may edit it.
 */
export function TaskPage({ task, project, column, columns, overdue, blocked, collaboration, onBack, onEdit, onMove, onDuplicate, onDelete }: TaskPageProps) {
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const assignee = taskAssignees(task)[0];
  const done = column === 'done';
  const followUpShown = collaboration.taskId === task.id;
  const activityLoading = useAnnouncedText(followUpShown ? '' : 'Chargement de l’activité…');
  const delay = done ? 'Terminée' : taskDelayLabel(task.dueDate);

  React.useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    // The follow-up of the task is read as soon as its page opens (`open` toggles: only when another task is shown).
    if (collaboration.taskId !== task.id) void collaboration.open(task.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once per task shown
  }, [task.id]);

  return (
    <article aria-labelledby={`task-page-title-${task.id}`} className="space-y-6" data-task-page={task.id}>
      {/* The back link is named by its visible text first (RGAA 11.9). */}
      <nav aria-label="Fil d’Ariane de la tâche" className="flex flex-wrap items-center gap-2 text-sm text-[var(--mairie-text-muted)]">
        <Button variant="link" tone="neutral" size="s" icon={ArrowLeft} label={`${getProjectNumber(project)} · ${project.title}`} aria-label={`${getProjectNumber(project)} · ${project.title}, retour aux tâches`} type="button" onClick={onBack} />
        <span aria-hidden>/</span>
        <span aria-current="page">Tâche</span>
      </nav>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <h2 id={`task-page-title-${task.id}`} ref={titleRef} tabIndex={-1} className="text-2xl font-semibold text-[var(--mairie-text)] [overflow-wrap:anywhere] focus-visible:outline-none">{task.title}</h2>
          <div role="group" aria-label="Résumé de la tâche" className="flex flex-wrap items-center gap-2 text-sm">
            <TaskActionsMenu title={task.title} column={column} columns={columns} disabled={blocked} trigger="status" onMove={onMove} />
            <PriorityPill level={task.priority} size="s" />
            {overdue && <StatusPill label="En retard" tone="danger" dot size="s" />}
            <span aria-hidden className="h-4 w-px bg-[var(--mairie-border)]" />
            {assignee ? <UserIdentity name={assignee.name} variant="nameOnly" size="s" /> : <span className="text-[var(--mairie-text-muted)]">Non assignée</span>}
            <span className="text-[var(--mairie-text-muted)]">Échéance : {formatProjectDate(task.dueDate)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* A pending or unverified task can be opened in the edit too: its save stays disabled there (MAIR-859). */}
          {onEdit && <Button variant="outline" tone="neutral" icon={Pencil} label="Modifier" type="button" onClick={onEdit} />}
          {onMove && (
            done
              ? <Button variant="solid" tone="primary" icon={RotateCcw} label="Rouvrir" type="button" disabled={blocked} onClick={() => onMove('todo')} />
              : <Button variant="solid" tone="primary" icon={Check} label="Marquer comme terminée" type="button" disabled={blocked} onClick={() => onMove('done')} />
          )}
          <TaskActionsMenu title={task.title} column={column} columns={columns} disabled={blocked} size="m" onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_clamp(280px,26vw,360px)]">
        <div className="min-w-0 space-y-8">
          <Panel title="Description">
            {task.description?.trim() ? (
              <p data-task-description className="max-w-[72ch] whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--mairie-text)] [overflow-wrap:anywhere]">{task.description}</p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-[var(--mairie-text-muted)]">Aucune description pour l’instant.</span>
                {onEdit && <Button variant="outline" tone="neutral" size="s" icon={Pencil} label="Ajouter une description" type="button" onClick={onEdit} />}
              </div>
            )}
          </Panel>
          <section aria-label="Activité de la tâche" className="space-y-3">
            <h3 className="text-base font-semibold text-[var(--mairie-text)]">Activité</h3>
            <p role="status" className={activityLoading ? 'text-sm text-[var(--mairie-text-muted)]' : 'sr-only'}>{activityLoading}</p>
            {followUpShown && (
              <TaskFollowUp
                taskTitle={task.title}
                loading={collaboration.loading}
                saving={collaboration.saving}
                error={collaboration.error}
                collaboration={collaboration.collaboration}
                canComment={task.permissions?.canComment !== false}
                message={collaboration.message}
                onMessageChange={collaboration.setMessage}
                onRefresh={collaboration.refresh}
                onSubmit={(event) => void collaboration.submit(event, task.id)}
              />
            )}
          </section>
        </div>
        {/* A section, not an aside: a complementary landmark may not sit inside main (RGAA 9.2). */}
        <section aria-label="Informations de la tâche" className="min-w-0">
          <Panel title="Informations">
            <DescriptionList
              labelWidth={110}
              items={[
                { id: 'assignee', label: 'Assignée à', value: assignee ? <UserIdentity name={assignee.name} variant="nameOnly" size="s" /> : 'Non assignée' },
                // MAIR-1087: « Du … au … » once the task has a start date.
                { id: 'period', label: 'Période', value: task.startDate ? `Du ${formatProjectDate(task.startDate)} au ${formatProjectDate(task.dueDate)}` : `Jusqu’au ${formatProjectDate(task.dueDate)}` },
                { id: 'delay', label: 'Délai', value: delay || '—' },
                { id: 'priority', label: 'Priorité', value: <PriorityPill level={task.priority} size="s" /> },
                { id: 'project', label: 'Projet', value: project.title },
              ]}
            />
          </Panel>
        </section>
      </div>
    </article>
  );
}
