import type { ProjectTask } from '../types/project';

export type TaskConfirmation = { revision: number; task: ProjectTask | null };

export function taskConfirmationsAfter(
  latest: ReadonlyMap<string, TaskConfirmation> | undefined,
  revision: number
): Map<string, ProjectTask | null> {
  const changes = new Map<string, ProjectTask | null>();
  for (const [id, confirmation] of latest ?? []) {
    if (confirmation.revision > revision) changes.set(id, confirmation.task);
  }
  return changes;
}

// A coherent later read can refine a receipt or confirm its absence. Retain
// that actual read for project writes still in flight, without inventing tasks.
export function reconcileTaskConfirmations(
  latest: ReadonlyMap<string, TaskConfirmation>,
  tasks: ProjectTask[]
): Map<string, TaskConfirmation> {
  const received = new Map(tasks.map(task => [task.id, task]));
  return new Map([...latest].map(([id, confirmation]) =>
    [id, { revision: confirmation.revision, task: received.get(id) ?? null }]));
}

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
