'use client';

import { ProjectCard } from '../ProjectCard';
import type { Project, ProjectTaskDraft } from '@/types/project';
import { type FilterOption } from '@/lib/projectPageState';
import { ProjectsEmptyState as EmptyState } from '../ProjectsEmptyState';

export function GridView({
  projects,
  workflowPort,
  taskCreationStates,
  onInspectTaskCreation,
  onPreserveTaskDraft,
  duplicatingProjectIds = [],
  unverifiedDuplicationSourceIds,
  memberOptions,
  labelOptions,
  onProjectOpen,
  onProjectEdit,
  onProjectDuplicate,
  onProjectDelete,
  onProjectTaskAdd,
}: {
  projects: Project[];
  workflowPort?: import('@/lib/projectWorkflow').ProjectWorkflowPort;
  taskCreationStates?: ReadonlyMap<string, import('../TaskCreationNotice').TaskCreationState>;
  onInspectTaskCreation?: (projectId: string) => void | Promise<void>;
  onPreserveTaskDraft?: import('../ProjectCard/project-card-types').ProjectCardProps['onPreserveTaskDraft'];
  duplicatingProjectIds?: string[];
  unverifiedDuplicationSourceIds?: ReadonlySet<string>;
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  onProjectOpen: (project: Project) => void;
  onProjectEdit: (project: Project) => void;
  onProjectDuplicate: (project: Project) => void;
  onProjectDelete: (project: Project) => void;
  onProjectTaskAdd: (project: Project, task: ProjectTaskDraft) => void | Promise<void>;
}) {
  if (projects.length === 0) return <EmptyState />;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          workflowPort={workflowPort}
          variant="grid"
          taskCreationState={taskCreationStates?.get(project.id)}
          onInspectTaskCreation={onInspectTaskCreation}
          onPreserveTaskDraft={onPreserveTaskDraft}
          duplicationPending={duplicatingProjectIds.includes(project.id)}
          duplicationVerificationRequired={unverifiedDuplicationSourceIds?.has(project.id)}
          memberOptions={memberOptions}
          labelOptions={labelOptions}
          onOpen={onProjectOpen}
          onEdit={onProjectEdit}
          onDuplicate={onProjectDuplicate}
          onDelete={onProjectDelete}
          onAddTask={onProjectTaskAdd}
        />
      ))}
    </div>
  );
}

