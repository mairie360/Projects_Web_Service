import React from 'react';
import type { ProjectTask } from '@/types/project';
import type { TaskColumnStatus } from '../../use-detail-task-form';
import { taskColumn, type BoardTask } from './task-board-model';

/**
 * MAIR-859 (C2): a moved task shows in its new column while the BFF write runs, and goes back to its column when the
 * write is refused (the controller reports it in a toast). A task completed here stays in « Terminé », struck
 * through, after the BFF archived it out of the detail (MAIR-559), until the project changes.
 */
export function useTaskBoard({ tasks, onMoveTask }: {
  tasks: ProjectTask[];
  onMoveTask: (task: ProjectTask, status: TaskColumnStatus) => Promise<boolean>;
}) {
  const [moves, setMoves] = React.useState<ReadonlyMap<string, TaskColumnStatus>>(new Map());
  const [completed, setCompleted] = React.useState<ProjectTask[]>([]);
  const movingRef = React.useRef(new Set<string>());

  const boardTasks = React.useMemo<BoardTask[]>(() => {
    const listed = new Set(tasks.map((task) => task.id));
    const kept = completed.filter((task) => !listed.has(task.id));
    return [...tasks, ...kept].map((task) => ({
      task,
      column: moves.get(task.id) ?? taskColumn(task),
      archived: !listed.has(task.id),
      moving: moves.has(task.id),
    }));
  }, [completed, moves, tasks]);

  const move = async (task: ProjectTask, status: TaskColumnStatus) => {
    if (movingRef.current.has(task.id) || taskColumn(task) === status) return false;
    movingRef.current.add(task.id);
    setMoves((current) => new Map(current).set(task.id, status));
    let confirmed = false;
    try {
      confirmed = await onMoveTask(task, status);
    } finally {
      movingRef.current.delete(task.id);
      setMoves((current) => {
        const next = new Map(current);
        next.delete(task.id);
        return next;
      });
    }
    if (confirmed) {
      setCompleted((current) => status === 'done'
        ? [...current.filter((item) => item.id !== task.id), { ...task, status: 'done', completed: true }]
        : current.filter((item) => item.id !== task.id));
    }
    return confirmed;
  };

  /** Done tasks archived by the BFF that the board still shows (they are part of `project.tasks.archived`). */
  const keptArchived = boardTasks.filter((item) => item.archived).length;

  return { boardTasks, move, keptArchived };
}
