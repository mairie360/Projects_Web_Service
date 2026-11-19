'use client';

import { useEffect } from 'react';
import { useToast } from '@mairie360/lib-components/primitives';

export type Feedback = { title: string; message: string };

/**
 * Hands a confirmation to the lib ToastProvider (MAIR-829, Figma F4 « Statut mis à jour »): a success toast that
 * floats over the page for 5 s. Renders nothing itself; `onShown` clears the feedback so it is shown once.
 */
export function FeedbackToast({ feedback, onShown }: { feedback: Feedback | null; onShown: () => void }) {
  const toast = useToast();
  useEffect(() => {
    if (!feedback) return;
    toast.success(feedback.message, { title: feedback.title });
    onShown();
  }, [feedback, onShown, toast]);
  return null;
}
