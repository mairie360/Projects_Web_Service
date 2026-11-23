'use client';

import { useEffect } from 'react';
import { useToast } from '@mairie360/lib-components/primitives';

/** A confirmation (success, by default) or, since MAIR-859, a refused write (`tone: 'error'`, persistent like every lib error toast). */
export type Feedback = { title: string; message: string; tone?: 'success' | 'error' };

/**
 * Hands a confirmation to the lib ToastProvider (MAIR-829, Figma F4 « Statut mis à jour »): a success toast that
 * floats over the page for 5 s. Renders nothing itself; `onShown` clears the feedback so it is shown once.
 */
export function FeedbackToast({ feedback, onShown }: { feedback: Feedback | null; onShown: () => void }) {
  const toast = useToast();
  useEffect(() => {
    if (!feedback) return;
    if (feedback.tone === 'error') toast.error(feedback.message, { title: feedback.title });
    else toast.success(feedback.message, { title: feedback.title });
    onShown();
  }, [feedback, onShown, toast]);
  return null;
}
