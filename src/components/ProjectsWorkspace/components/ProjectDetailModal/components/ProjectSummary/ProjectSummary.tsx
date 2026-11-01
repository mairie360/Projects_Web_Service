import type React from 'react';

import { formatProjectDate } from '@/components/ProjectsWorkspace/project-card-meta';
import type { Project } from '@/types/project';
import { PersonAvatar } from '../../../PersonAvatar';
import { PriorityPill } from '../../../PriorityPill';
import { ProgressMeter } from '../../../ProgressMeter';
import { StatusPill } from '../../../StatusPill';

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-[#57606a]">{label}</span>
    {children}
  </div>
);

/** Read-only side column: description, progress, status, priority, responsible, due date, people and labels. */
export const ProjectSummary = ({ project }: { project: Project }) => (
  <>
    <div>
      <h3 className="text-sm font-semibold text-[#24292f]">Description</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#57606a]">{project.description}</p>
    </div>

    <div>
      <h3 className="mb-2 text-sm font-semibold text-[#24292f]">Progression</h3>
      <ProgressMeter value={project.progress} />
    </div>

    <div className="space-y-3 text-sm">
      <Fact label="Statut"><StatusPill status={project.status} /></Fact>
      <Fact label="Priorité"><PriorityPill priority={project.priority} /></Fact>
      <Fact label="Responsable">
        <span className="inline-flex min-w-0 items-center gap-2 font-medium text-[#24292f]">
          <PersonAvatar name={project.responsible.name} />
          <span className="truncate">{project.responsible.name}</span>
        </span>
      </Fact>
      <Fact label="Échéance"><span className="font-medium text-[#24292f]">{formatProjectDate(project.dueDate)}</span></Fact>
    </div>

    <div>
      <h3 className="mb-2 text-sm font-semibold text-[#24292f]">Assignés</h3>
      <div className="flex flex-wrap gap-2">
        {project.assignees.map((assignee) => (
          <span key={assignee.name} className="inline-flex items-center gap-2 rounded-full border border-[#d0d7de] bg-white px-2.5 py-1 text-xs font-medium text-[#24292f]">
            <PersonAvatar name={assignee.name} />
            {assignee.name}
          </span>
        ))}
      </div>
    </div>

    <div>
      <h3 className="mb-2 text-sm font-semibold text-[#24292f]">Étiquettes</h3>
      <div className="flex flex-wrap gap-2">
        {project.labels.map((label) => (
          <span key={label} className="inline-flex h-6 items-center rounded-full border border-[#d0d7de] bg-white px-2.5 text-xs font-semibold text-[#57606a]">
            {label}
          </span>
        ))}
      </div>
    </div>
  </>
);
