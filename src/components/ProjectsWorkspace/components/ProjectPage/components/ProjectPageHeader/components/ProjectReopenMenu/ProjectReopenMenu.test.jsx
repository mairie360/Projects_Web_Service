import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectReopenMenu } from './ProjectReopenMenu';

describe('ProjectReopenMenu (MAIR-1200)', () => {
  it('lists the open statuses under « Rouvrir le projet en » and reopens in the chosen one', async () => {
    const onReopen = vi.fn();
    render(<ProjectReopenMenu onReopen={onReopen} />);
    const trigger = screen.getByRole('button', { name: 'Rouvrir' });
    expect(trigger.getAttribute('data-variant')).toBe('outline');
    await userEvent.click(trigger);
    expect(screen.getByRole('menu', { name: 'Rouvrir le projet en' })).toBeTruthy();
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['À faire', 'En cours', 'En revue', 'Suspendu']);
    await userEvent.click(screen.getByRole('menuitem', { name: 'En revue' }));
    expect(onReopen).toHaveBeenCalledWith('review');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('stays closed while a write is pending', () => {
    render(<ProjectReopenMenu onReopen={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'Rouvrir' }).hasAttribute('disabled')).toBe(true);
  });
});
