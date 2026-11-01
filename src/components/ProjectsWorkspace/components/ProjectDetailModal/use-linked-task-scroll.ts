import React from 'react';
import type { ProjectTask } from '@/types/project';

// Brings the task reached by a deep link into the scrolling body, once per task.
export function useLinkedTaskScroll(highlightTaskId: string | null | undefined, filteredTasks: ProjectTask[]) {
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
    const content = contentRef.current;
    if (!content) return;
    const target = article.getBoundingClientRect();
    const viewport = content.getBoundingClientRect();
    const scrollTop = content.scrollTop;
    const availableHeight = content.clientHeight;
    // Scroll only the detail body: scrollIntoView also moves the outer dialog
    // and can hide its fixed header and close button.
    content.scrollTop = scrollTop + target.top - viewport.top - Math.max(0, (availableHeight - target.height) / 2);
    article.focus?.({ preventScroll: true });
    focusedLinkedTaskRef.current = article;
  }, [filteredTasks, highlightTaskId]);

  return { contentRef, highlightedTaskRef };
}
