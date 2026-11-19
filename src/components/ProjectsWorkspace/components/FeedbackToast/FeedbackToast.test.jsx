import { render, screen } from '@testing-library/react';
import { ToastProvider } from '@mairie360/lib-components/primitives';
import { describe, expect, it, vi } from 'vitest';
import { FeedbackToast } from './FeedbackToast';

describe('FeedbackToast', () => {
  it('MAIR-829: shows the feedback once as a success toast, then clears it', async () => {
    const onShown = vi.fn();
    const feedback = { title: 'Statut mis à jour', message: '« Voirie » est maintenant « En revue ».' };
    render(<ToastProvider regionLabel="Notifications"><FeedbackToast feedback={feedback} onShown={onShown} /></ToastProvider>);
    expect((await screen.findAllByText('« Voirie » est maintenant « En revue ».')).length).toBeGreaterThan(0);
    expect(onShown).toHaveBeenCalledOnce();
  });

  it('renders nothing without feedback', () => {
    const onShown = vi.fn();
    const { container } = render(<ToastProvider regionLabel="Notifications"><FeedbackToast feedback={null} onShown={onShown} /></ToastProvider>);
    expect(onShown).not.toHaveBeenCalled();
    expect(container.textContent).toBe('');
  });
});
