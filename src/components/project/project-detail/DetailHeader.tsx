import { ToolTip } from '@mairie360/lib-components/primitives';
import { X } from 'lucide-react';

import type { Project } from '../../../types/project';

export interface DetailHeaderProps {
  project: Project;
  titleId: string;
  editing: boolean;
  editDisabled: boolean;
  closeDisabled: boolean;
  onToggleEdit: () => void;
  onClose: () => void;
}

/** Breadcrumb, title, the edit toggle (when allowed) and the close button. */
export const DetailHeader = ({ project, titleId, editing, editDisabled, closeDisabled, onToggleEdit, onClose }: DetailHeaderProps) => (
  <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#dedbd6] bg-[#fbfaf8] px-5 py-4">
    <div className="min-w-0">
      <p className="mb-1 text-xs font-medium text-[#57606a]">Mairie360 / projets #{project.id}</p>
      <h2 id={titleId} className="line-clamp-2 text-lg font-semibold leading-snug text-[#24292f]">{project.title}</h2>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      {project.permissions?.canEdit !== false && <button
        type="button"
        disabled={editDisabled}
        className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-xs font-semibold text-[#24292f] transition hover:bg-[#f6f8fa]"
        onClick={onToggleEdit}
      >
        {editing ? 'Annuler' : 'Modifier'}
      </button>}
      <ToolTip text="Fermer">
        <button
          type="button"
          aria-label="Fermer la fiche projet"
          disabled={closeDisabled}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#57606a] transition hover:bg-[#d8dee4] hover:text-[#24292f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da]/30"
          onClick={onClose}
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </ToolTip>
    </div>
  </header>
);
