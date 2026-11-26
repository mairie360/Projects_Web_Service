import { Panel } from '@mairie360/lib-components/primitives';

import type { Project, ProjectTask } from '@/types/project';
import { MilestonesPanel, type MilestonesPanelProps } from './components/MilestonesPanel';
import { NextTasksPanel } from './components/NextTasksPanel';
import { ProjectLifecycle } from './components/ProjectLifecycle';
import { ProjectSummary } from './components/ProjectSummary';
import { RecentActivityPanel, type RecentActivityPanelProps } from './components/RecentActivityPanel';

export interface ProjectOverviewProps {
  project: Project;
  tasks: ProjectTask[];
  pendingTaskIds?: ReadonlySet<string>;
  disabled?: boolean;
  lifecycleDisabled?: boolean;
  onCompleteTask: (task: ProjectTask) => void;
  onShowTab: (tab: 'tasks' | 'activity') => void;
  /** MAIR-1137 (C15): opens the page of a task of « Prochaines tâches ». */
  onOpenTask?: (task: ProjectTask) => void;
  onSuspend: () => void;
  /** MAIR-1084: puts a project on hold back in progress. */
  onResume?: () => void;
  onCloseProject: () => void;
  /** MAIR-1086: the milestones of the project and their writes (the page owns them, the planning reads them too). */
  milestones: Omit<MilestonesPanelProps, 'disabled'>;
  /** MAIR-1089: the latest entries of the project activity. */
  activity: Omit<RecentActivityPanelProps, 'onShowAll'>;
}

/** MAIR-846 (C6, Figma F5 5.2) « Vue d’ensemble »: next tasks, milestones, information and recent activity. */
export const ProjectOverview = ({
  project, tasks, pendingTaskIds, disabled = false, lifecycleDisabled = false, onCompleteTask, onShowTab, onOpenTask, onSuspend, onResume, onCloseProject, milestones, activity,
}: ProjectOverviewProps) => (
  <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_clamp(320px,28vw,380px)]">
    <div className="min-w-0 space-y-8">
      <NextTasksPanel tasks={tasks} pendingTaskIds={pendingTaskIds} disabled={disabled} onComplete={onCompleteTask} onOpen={onOpenTask} onShowAll={() => onShowTab('tasks')} />
      <MilestonesPanel {...milestones} disabled={disabled} />
    </div>
    {/* A section, not an aside: a complementary landmark may not sit inside main (RGAA 9.2). */}
    <section className="min-w-0 space-y-8" aria-label="Informations du projet">
      <Panel title="Informations">
        <ProjectSummary project={project} />
        {project.permissions?.canClose !== false && (
          <ProjectLifecycle disabled={lifecycleDisabled} onHold={project.status === 'on-hold'} onSuspend={onSuspend} onResume={onResume} onClose={onCloseProject} />
        )}
      </Panel>
      <RecentActivityPanel {...activity} onShowAll={() => onShowTab('activity')} />
    </section>
  </div>
);
