import { Button, Panel } from '@mairie360/lib-components/primitives';

import type { Project, ProjectTask } from '@/types/project';
import { NextTasksPanel } from './components/NextTasksPanel';
import { ProjectLifecycle } from './components/ProjectLifecycle';
import { ProjectSummary } from './components/ProjectSummary';

export interface ProjectOverviewProps {
  project: Project;
  tasks: ProjectTask[];
  pendingTaskIds?: ReadonlySet<string>;
  disabled?: boolean;
  lifecycleDisabled?: boolean;
  onCompleteTask: (task: ProjectTask) => void;
  onShowTab: (tab: 'tasks' | 'activity') => void;
  onSuspend: () => void;
  onCloseProject: () => void;
}

/**
 * MAIR-846 (C6, Figma F5 5.2) « Vue d’ensemble »: next tasks, milestones, information and recent activity.
 * The published contract has neither milestones nor a project activity yet (ticket BFF of the epic): those
 * panels say so instead of showing made-up content.
 */
export const ProjectOverview = ({
  project, tasks, pendingTaskIds, disabled = false, lifecycleDisabled = false, onCompleteTask, onShowTab, onSuspend, onCloseProject,
}: ProjectOverviewProps) => (
  <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
    <div className="min-w-0 space-y-5">
      <NextTasksPanel tasks={tasks} pendingTaskIds={pendingTaskIds} disabled={disabled} onComplete={onCompleteTask} onShowAll={() => onShowTab('tasks')} />
      <Panel
        title="Jalons"
        description="Étapes clés validées par la collectivité"
        state="unavailable"
        stateProps={{ title: 'Jalons non disponibles', description: 'Les jalons du projet ne sont pas encore fournis par le service Projets.' }}
      />
    </div>
    <aside className="min-w-0 space-y-5" aria-label="Informations du projet">
      <Panel title="Informations">
        <ProjectSummary project={project} />
        {project.permissions?.canClose !== false && (
          <ProjectLifecycle disabled={lifecycleDisabled} onSuspend={onSuspend} onClose={onCloseProject} />
        )}
      </Panel>
      <Panel
        title="Activité récente"
        action={<Button variant="outline" tone="neutral" size="s" label="Tout voir" onClick={() => onShowTab('activity')} />}
        state="unavailable"
        stateProps={{ title: 'Activité non disponible', description: 'Le journal du projet n’est pas encore fourni par le service Projets.' }}
      />
    </aside>
  </div>
);
