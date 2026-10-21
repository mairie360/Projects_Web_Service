import { Avatar } from '@mairie360/lib-components/primitives';
import { getInitials } from '../../project-card-meta';

export function PersonAvatar({ name, className = '' }: { name: string; className?: string }) {
  return (
    <Avatar
      alt={name}
      fallback={<span className="text-[10px] font-semibold leading-none text-white">{getInitials(name)}</span>}
      className={`!h-5 !w-5 border border-white shadow-sm ${className}`}
    />
  );
}
