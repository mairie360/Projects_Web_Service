import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceHeader, accessScopeLabel } from './WorkspaceHeader';

describe('WorkspaceHeader', () => {
  it('names the access scope and shows create only when allowed', async () => {
    const onCreate = vi.fn(); const onSettings = vi.fn();
    const { rerender } = render(<WorkspaceHeader title="Projets" subtitle="Suivi" scope="team" onSettings={onSettings} />);
    expect(screen.getByText('Projets de mon équipe')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Nouveau projet' })).toBeNull();
    rerender(<WorkspaceHeader title="Projets" subtitle="Suivi" onCreate={onCreate} onSettings={onSettings} />);
    await userEvent.click(screen.getByRole('button', { name: 'Nouveau projet' }));
    await userEvent.click(screen.getByRole('button', { name: 'Paramètres' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onSettings).toHaveBeenCalledTimes(1);
    expect([accessScopeLabel('all'), accessScopeLabel('assigned')]).toEqual(['Tous les projets municipaux', 'Mes projets assignés']);
  });
});
