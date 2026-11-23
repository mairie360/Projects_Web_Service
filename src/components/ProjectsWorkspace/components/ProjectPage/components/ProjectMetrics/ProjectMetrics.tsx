import { MetricCard } from '@mairie360/lib-components/primitives';
import { CalendarDays, ChartColumn, Clock, TrendingUp } from 'lucide-react';

import type { Project, ProjectTask } from '@/types/project';
import { dueMetric, overdueTasksMetric, progressMetric } from './project-metrics';

/**
 * MAIR-846 (C4, Figma F5 5.2): Avancement, Échéance, Budget engagé, Tâches en retard. The published contract
 * has no budget yet (ticket BFF of the epic): the card says so instead of showing a made-up amount.
 */
export const ProjectMetrics = ({ project, tasks }: { project: Project; tasks: ProjectTask[] }) => {
  const progress = progressMetric(project);
  const due = dueMetric(project);
  const overdue = overdueTasksMetric(tasks);
  return (
    <section aria-label="Indicateurs du projet" className="grid grid-cols-2 gap-5 xl:grid-cols-4">
      <MetricCard label="Avancement" value={progress.value} icon={TrendingUp} trend="none" trendLabel={progress.detail} />
      <MetricCard label="Échéance" value={due.value} icon={CalendarDays} trend="none" trendLabel={due.detail} />
      <MetricCard label="Budget engagé" value="—" icon={ChartColumn} trend="none" trendLabel="Budget non renseigné" />
      <MetricCard label="Tâches en retard" value={overdue.value} icon={Clock} trend="none" trendLabel={overdue.detail} />
    </section>
  );
};
