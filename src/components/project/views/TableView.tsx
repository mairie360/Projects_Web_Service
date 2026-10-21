'use client';

import {
  formatProjectDate,
  PersonAvatar,
  PriorityPill,
  ProgressMeter,
  ProjectActionsMenu,
  StatusPill,
} from '../../ProjectCard';
import type { Project } from '../../../types/project';
import { ProjectsEmptyState as EmptyState } from './ProjectsEmptyState';

export function TableView({
  projects,
  duplicatingProjectIds = [],
  unverifiedDuplicationSourceIds,
  onProjectOpen,
  onProjectEdit,
  onProjectDuplicate,
  onProjectDelete,
}: {
  projects: Project[];
  duplicatingProjectIds?: string[];
  unverifiedDuplicationSourceIds?: ReadonlySet<string>;
  onProjectOpen: (project: Project) => void;
  onProjectEdit: (project: Project) => void;
  onProjectDuplicate: (project: Project) => void;
  onProjectDelete: (project: Project) => void;
}) {
  if (projects.length === 0) return <EmptyState />;

  return (
    <div className="overflow-hidden rounded-lg border border-[#d9d5d0] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1060px] text-left">
          <thead className="border-b border-[#d9d5d0] bg-[#fbfaf8] text-base font-semibold text-[#2f3438]">
            <tr>
              <th className="px-5 py-4">Projet</th>
              <th className="px-5 py-4">Statut</th>
              <th className="px-5 py-4">Responsable</th>
              <th className="px-5 py-4">Priorité</th>
              <th className="px-5 py-4">Progression</th>
              <th className="px-5 py-4">Échéance</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e4e1dc]">
            {projects.map((project) => (
              <tr
                key={project.id}
                className={`${project.permissions?.canView === false ? '' : 'cursor-pointer '}transition hover:bg-[#f8f6f3]`}
                onClick={() => { if (project.permissions?.canView !== false) onProjectOpen(project); }}
              >
                <td className="max-w-[360px] px-5 py-4">
                  <button
                    type="button"
                    aria-label={`Ouvrir la fiche du projet ${project.title}`}
                    aria-haspopup="dialog"
                    disabled={project.permissions?.canView === false}
                    className="block w-full truncate text-left text-base font-semibold text-[#172033] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0969da] disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={(event) => { event.stopPropagation(); onProjectOpen(project); }}
                  >
                    {project.title}
                  </button>
                  <div className="truncate text-sm text-[#5e6873]">{project.description}</div>
                </td>
                <td className="px-5 py-4">
                  <StatusPill status={project.status} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 text-sm text-[#2f3438]">
                    <PersonAvatar name={project.responsible.name} />
                    <span>{project.responsible.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <PriorityPill priority={project.priority} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex w-36 items-center gap-3">
                    <div className="w-20">
                      <ProgressMeter value={project.progress} showLabel={false} compact />
                    </div>
                    <span className="text-sm font-semibold text-[#2f3438]">{project.progress}%</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-[#5e6873]">{formatProjectDate(project.dueDate)}</td>
                <td className="px-5 py-4">
                  <ProjectActionsMenu
                    project={project}
                    duplicationPending={duplicatingProjectIds.includes(project.id)}
                    duplicationVerificationRequired={unverifiedDuplicationSourceIds?.has(project.id)}
                    onEdit={onProjectEdit}
                    onDuplicate={onProjectDuplicate}
                    onDelete={onProjectDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
