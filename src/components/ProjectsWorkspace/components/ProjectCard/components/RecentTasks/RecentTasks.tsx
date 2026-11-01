import { CheckSquare2, ListChecks, Square } from 'lucide-react';
import type { ProjectTask } from '@/types/project';
import { statusMeta } from '@/components/ProjectsWorkspace/project-card-meta';
import { PersonAvatar } from '../../../PersonAvatar';

export function RecentTasks({ tasks }: { tasks?: ProjectTask[] }) {
  if (!tasks || tasks.length === 0) return null;

  const visibleTasks = tasks.slice(-2).reverse();

  return (
    <div className="mb-3 rounded-md border border-[#d8dee4] bg-[#f6f8fa] px-2.5 py-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#57606a]">
        <ListChecks className="h-3.5 w-3.5" strokeWidth={1.8} />
        Tâches récentes
      </div>
      <div className="space-y-1.5">
        {visibleTasks.map((task) => {
          const TaskIcon = task.completed ? CheckSquare2 : Square;

          return (
            <div key={task.id} className="flex items-center gap-1.5 text-xs text-[#57606a]">
              <TaskIcon
                className={`h-3.5 w-3.5 shrink-0 ${task.completed ? 'text-[#1a7f37]' : 'text-[#8c959f]'}`}
                strokeWidth={1.8}
              />
              <span className="min-w-0 flex-1 truncate text-[#24292f]">{task.title}</span>
              <span className="flex shrink-0 -space-x-1">
                {(task.assignees?.length ? task.assignees : [task.responsible]).slice(0, 2).map((assignee) => (
                  <PersonAvatar key={assignee.name} name={assignee.name} />
                ))}
              </span>
              <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#57606a]">
                {statusMeta[task.status].label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
