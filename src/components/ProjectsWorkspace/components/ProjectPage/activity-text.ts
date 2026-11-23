import type { ActivityItem } from '@/types/project';

/**
 * MAIR-1089: the sentence of an activity entry (« Alice Martin a commenté », « Marie Durand a changé l’état de
 * « Relevé » »). The history label of Project API (« Statut modifié »…) is shown under it; a comment shows its text.
 */
export function describeActivity(item: ActivityItem) {
  const author = item.author?.name ?? 'La plateforme';
  const task = item.taskTitle ? `« ${item.taskTitle} »` : 'une tâche';
  switch (item.kind) {
    case 'comment':
      return { action: `${author} a commenté le projet`, detail: item.message ?? '' };
    case 'task_created':
      return { action: `${author} a créé la tâche ${task}`, detail: '' };
    case 'status_changed':
      return { action: `${author} a changé l’état de ${task}`, detail: item.label };
    default:
      return { action: `${author} a modifié la tâche ${task}`, detail: item.label };
  }
}
