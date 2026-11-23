import { MetricCard } from '@mairie360/lib-components/primitives';
import { CalendarDays, ChartColumn, Clock, TrendingUp } from 'lucide-react';

import { budgetMetric } from '@/lib/projectBudget';
import type { Project, ProjectTask } from '@/types/project';
import { dueMetric, overdueTasksMetric, progressMetric } from './project-metrics';

/**
 * MAIR-846 (C4, Figma F5 5.2): Avancement, Échéance, Budget engagé, Tâches en retard. The budget engaged on the
 * voted one comes from the contract since MAIR-1085; a project without budget says so.
 */
export const ProjectMetrics = ({ project, tasks }: { project: Project; tasks: ProjectTask[] }) => {
  const progress = progressMetric(project);
  const due = dueMetric(project);
  const overdue = overdueTasksMetric(tasks);
  const budget = budgetMetric(project);
  return (
    <section aria-label="Indicateurs du projet" className="grid grid-cols-2 gap-5 xl:grid-cols-4">
      <MetricCard label="Avancement" value={progress.value} icon={TrendingUp} trend="none" trendLabel={progress.detail} />
      <MetricCard label="Échéance" value={due.value} icon={CalendarDays} trend="none" trendLabel={due.detail} />
      <MetricCard label="Budget engagé" value={budget.value} icon={ChartColumn} trend={budget.over ? 'down' : 'none'} trendLabel={budget.detail} />
      <MetricCard label="Tâches en retard" value={overdue.value} icon={Clock} trend="none" trendLabel={overdue.detail} />
    </section>
  );
};
