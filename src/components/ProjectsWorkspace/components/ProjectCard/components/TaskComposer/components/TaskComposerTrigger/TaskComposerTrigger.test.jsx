import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskComposerTrigger } from './TaskComposerTrigger';

describe('TaskComposerTrigger', () => {
  it('opens the composer, or asks for an inspection while creation is blocked', async () => {
    const onOpen = vi.fn();
    const { rerender } = render(<TaskComposerTrigger blocked={false} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter une tâche' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    rerender(<TaskComposerTrigger blocked creationState={{ uncertainTitle: 'Relevé' }} onOpen={onOpen} />);
    expect(screen.getByRole('button', { name: 'Création à inspecter' })).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
