import React from 'react';
import { createProjectMilestone, deleteProjectMilestone, getBffProjectErrorMessage, updateProjectMilestone, type MilestoneInput } from '@/lib/bffProjectClient';
import type { Milestone, Project } from '@/types/project';

const byDueDate = (left: Milestone, right: Milestone) => left.dueDate.localeCompare(right.dueDate) || left.id.localeCompare(right.id, 'fr', { numeric: true });

/**
 * MAIR-1086: the milestones of the project page. The detail carries the first 100 (and their total); every write
 * answers the milestone as saved, which replaces the shown one, so the overview and the planning stay in step
 * without reading the detail again. A new detail (another project, or a refresh) replaces the list.
 */
export function useProjectMilestones(project: Pick<Project, 'id' | 'milestones' | 'milestonesTotal'>) {
  const [state, setState] = React.useState(() => ({ source: project.milestones, projectId: project.id, items: [...(project.milestones ?? [])].sort(byDueDate), total: project.milestonesTotal ?? project.milestones?.length ?? 0 }));
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');
  const pendingRef = React.useRef(false);

  // A new official detail replaces the list (render-time sync: no stale frame with the previous project's milestones).
  if (state.source !== project.milestones || state.projectId !== project.id) {
    setState({ source: project.milestones, projectId: project.id, items: [...(project.milestones ?? [])].sort(byDueDate), total: project.milestonesTotal ?? project.milestones?.length ?? 0 });
    if (state.projectId !== project.id) setError('');
  }

  const run = async (key: string, write: () => Promise<(current: { items: Milestone[]; total: number }) => { items: Milestone[]; total: number }>) => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPendingId(key);
    setError('');
    const projectId = project.id;
    try {
      const apply = await write();
      setState((current) => current.projectId === projectId ? { ...current, ...apply(current) } : current);
      return true;
    } catch (failure) {
      setError(getBffProjectErrorMessage(failure));
      return false;
    } finally {
      pendingRef.current = false;
      setPendingId(null);
    }
  };

  const add = (input: MilestoneInput) => run('new', async () => {
    const created = await createProjectMilestone(project.id, input);
    return ({ items, total }) => ({ items: [...items.filter((item) => item.id !== created.id), created].sort(byDueDate), total: total + 1 });
  });

  const update = (milestoneId: string, patch: Partial<MilestoneInput>) => run(milestoneId, async () => {
    const saved = await updateProjectMilestone(project.id, milestoneId, patch);
    return ({ items, total }) => ({ items: items.map((item) => item.id === saved.id ? saved : item).sort(byDueDate), total });
  });

  const remove = (milestoneId: string) => run(milestoneId, async () => {
    await deleteProjectMilestone(project.id, milestoneId);
    return ({ items, total }) => ({ items: items.filter((item) => item.id !== milestoneId), total: Math.max(0, total - 1) });
  });

  return { milestones: state.items, total: state.total, pendingId, error, clearError: () => setError(''), add, update, remove };
}

export type ProjectMilestones = ReturnType<typeof useProjectMilestones>;
