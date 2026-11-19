'use client';

import { ProjectCard } from '../ProjectCard';
import type { Project } from '@/types/project';
import { ProjectsEmptyState as EmptyState } from '../ProjectsEmptyState';

export function GridView({
  projects,
  duplicatingProjectIds = [],
  unverifiedDuplicationSourceIds,
  onProjectOpen,
  onProjectDuplicate,
  onProjectDelete,
  onProjectStatusChange,
  onResetFilters,
}: {
  projects: Project[];
  duplicatingProjectIds?: string[];
  unverifiedDuplicationSourceIds?: ReadonlySet<string>;
  onProjectOpen: (project: Project) => void;
  onProjectDuplicate: (project: Project) => void;
  onProjectDelete: (project: Project) => void;
  onProjectStatusChange?: (project: Project, status: Project['status']) => void | Promise<void>;
  /** Shown in the empty state when a search or a filter hides every project (MAIR-829). */
  onResetFilters?: () => void;
}) {
  if (projects.length === 0) return <EmptyState onReset={onResetFilters} />;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          variant="grid"
          duplicationPending={duplicatingProjectIds.includes(project.id)}
          duplicationVerificationRequired={unverifiedDuplicationSourceIds?.has(project.id)}
          onOpen={onProjectOpen}
          onDuplicate={onProjectDuplicate}
          onDelete={onProjectDelete}
          onChangeStatus={onProjectStatusChange}
        />
      ))}
    </div>
  );
}
