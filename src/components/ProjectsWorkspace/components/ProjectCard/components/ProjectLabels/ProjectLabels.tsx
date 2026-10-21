import { labelStyles } from '@/components/ProjectsWorkspace/project-card-meta';

export function ProjectLabels({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.slice(0, 2).map((label, index) => (
        <span
          key={label}
          className={`inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-semibold leading-none ${labelStyles[index % labelStyles.length]}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
