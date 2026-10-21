import type { Project } from '@/types/project';
import { PersonAvatar } from '../../../PersonAvatar';

export function AvatarStack({ project }: { project: Project }) {
  return (
    <div className="flex -space-x-1.5">
      {project.assignees.slice(0, 3).map((assignee) => (
        <PersonAvatar key={assignee.name} name={assignee.name} />
      ))}
      {project.assignees.length > 3 && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#f6f8fa] text-[10px] font-semibold text-[#57606a]">
          +{project.assignees.length - 3}
        </span>
      )}
    </div>
  );
}
