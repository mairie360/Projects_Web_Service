import { Gantt, Panel } from '@mairie360/lib-components/primitives';
import { CalendarRange } from 'lucide-react';

import type { Milestone, ProjectTask } from '@/types/project';
import { instanceToday } from '../../../../project-card-meta';
import { planningMilestones, planningPeriod, planningRows } from './planning-model';

export interface ProjectPlanningTabProps {
  tasks: ProjectTask[];
  milestones: Milestone[];
  /** Opens the page of the task of a bar (the same page as from the board). */
  onOpenTask: (taskId: string) => void;
  /** Day the « aujourd'hui » marker stands on; the instance day by default. */
  today?: string;
}

/**
 * MAIR-868 (Figma F7) « Planning »: the lib `Gantt` (MAIR-891) — months header, milestones line, one bar per task from its
 * start date to its due date coloured by its state with the assignee's initials, « aujourd'hui » marker, legend. A bar
 * opens the task page; bars and milestones are focusable and named by the lib.
 */
export const ProjectPlanningTab = ({ tasks, milestones, onOpenTask, today = instanceToday() }: ProjectPlanningTabProps) => {
  const rows = planningRows(tasks, today);
  const items = planningMilestones(milestones);
  const period = planningPeriod(rows, items, today);
  const undated = tasks.length - rows.length;
  return (
    <Panel
      title="Planning"
      description="Tâches de la date de début à l’échéance, et jalons du projet"
      icon={CalendarRange}
      state={period ? 'default' : 'empty'}
      stateProps={{ title: 'Rien à planifier', description: 'Donnez une échéance aux tâches ou ajoutez des jalons pour les voir sur le planning.' }}
    >
      {period && (
        <div className="space-y-3">
          <Gantt label="Planning du projet" from={period.from} to={period.to} rows={rows} milestones={items} today={today} onRowClick={(row) => onOpenTask(row.id)} />
          {undated > 0 && (
            <p className="text-sm text-[var(--mairie-text-muted)]">
              {undated === 1 ? '1 tâche sans échéance n’apparaît pas sur le planning.' : `${undated} tâches sans échéance n’apparaissent pas sur le planning.`}
            </p>
          )}
        </div>
      )}
    </Panel>
  );
};
