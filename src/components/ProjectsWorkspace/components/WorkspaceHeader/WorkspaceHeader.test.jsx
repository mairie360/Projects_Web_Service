import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceHeader } from './WorkspaceHeader';

describe('WorkspaceHeader', () => {
  it('shows create only when allowed', async () => {
    const onCreate = vi.fn(); const onSettings = vi.fn();
    const { rerender } = render(<WorkspaceHeader title="Projets" subtitle="Suivi" onSettings={onSettings} />);
    expect(screen.queryByRole('button', { name: 'Nouveau projet' })).toBeNull();
    rerender(<WorkspaceHeader title="Projets" subtitle="Suivi" onCreate={onCreate} onSettings={onSettings} />);
    await userEvent.click(screen.getByRole('button', { name: 'Nouveau projet' }));
    await userEvent.click(screen.getByRole('button', { name: 'Paramètres' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onSettings).toHaveBeenCalledTimes(1);
  });

  it('MAIR-1254 shows « Paramètres » before « Nouveau projet » and no access scope tag', () => {
    render(<WorkspaceHeader title="Projets" subtitle="Suivi" onCreate={() => {}} onSettings={() => {}} />);
    const names = screen.getAllByRole('button').map((button) => button.textContent.trim());
    expect(names.indexOf('Paramètres')).toBeLessThan(names.indexOf('Nouveau projet'));
    expect(screen.queryByText(/Tous les projets municipaux|Projets de mon équipe|Mes projets assignés/)).toBeNull();
  });
});
