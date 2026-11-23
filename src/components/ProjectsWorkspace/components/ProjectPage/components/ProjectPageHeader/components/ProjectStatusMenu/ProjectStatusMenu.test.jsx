import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectStatusMenu } from './ProjectStatusMenu';

describe('ProjectStatusMenu (MAIR-846, Figma 5.4)', () => {
  it('is a plain status without the right to change it', () => {
    render(<ProjectStatusMenu status="todo" />);
    expect(screen.getByText('À faire')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('offers the five statuses (MAIR-1084: « Suspendu ») and ignores the current one', async () => {
    const user = userEvent.setup(); const onChange = vi.fn();
    render(<ProjectStatusMenu status="in-progress" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Statut : En cours. Changer le statut' }));
    expect(screen.getAllByRole('menuitemradio').map((item) => [item.textContent, item.getAttribute('aria-checked')])).toEqual([
      ['À faire', 'false'], ['En cours', 'true'], ['En revue', 'false'], ['Suspendu', 'false'], ['Terminé', 'false'],
    ]);
    fireEvent.keyDown(screen.getByRole('menuitemradio', { name: 'En cours' }), { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Changer le statut$/ }));
    fireEvent.keyDown(screen.getByRole('menuitemradio', { name: 'Terminé' }), { key: ' ' });
    expect(onChange).toHaveBeenCalledWith('done');
  });
});
