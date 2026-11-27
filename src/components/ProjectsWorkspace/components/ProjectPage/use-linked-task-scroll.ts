import React from 'react';
import type { ProjectTask } from '@/types/project';

// Brings the task reached by a deep link into view, once per task. Since MAIR-846 the project is a page (the
// window scrolls, no fixed dialog header to keep visible), so the task is centred with `scrollIntoView`.
// The linked task first opens on its own page (`viewedTaskId`): its card is centred once the board shows again.
export function useLinkedTaskScroll(highlightTaskId: string | null | undefined, filteredTasks: ProjectTask[], viewedTaskId: string | null = null) {
  const highlightedTaskRef = React.useRef<HTMLElement | null>(null);
  const focusedLinkedTaskRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  React.useLayoutEffect(() => {
    const article = highlightedTaskRef.current;
    if (!highlightTaskId) {
      focusedLinkedTaskRef.current = null;
      return;
    }
    if (!article || focusedLinkedTaskRef.current === article) return;
    article.scrollIntoView?.({ block: 'center' });
    article.focus?.({ preventScroll: true });
    focusedLinkedTaskRef.current = article;
  }, [filteredTasks, highlightTaskId, viewedTaskId]);

  return { contentRef, highlightedTaskRef };
}
