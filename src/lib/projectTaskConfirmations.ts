import type { ProjectTask } from '../types/project';

// Only confirmed receipts/deletions belong here, never submitted drafts.
export function applyTaskConfirmations(
  tasks: ProjectTask[] | undefined,
  confirmations: ReadonlyMap<string, ProjectTask | null>
): ProjectTask[] {
  const received = tasks ?? [];
  const updated = received.flatMap(task => {
    if (!confirmations.has(task.id)) return [task];
    const confirmed = confirmations.get(task.id);
    return confirmed ? [confirmed] : [];
  });
  for (const [id, task] of confirmations) {
    if (task && !received.some(value => value.id === id)) updated.push(task);
  }
  return updated;
}
