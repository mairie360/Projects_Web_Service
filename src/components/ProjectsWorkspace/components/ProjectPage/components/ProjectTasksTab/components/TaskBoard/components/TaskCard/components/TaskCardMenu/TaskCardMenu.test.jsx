import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskCardMenu } from './TaskCardMenu';

const columns = [{ status: 'todo', label: 'À faire' }, { status: 'in-progress', label: 'En cours' }, { status: 'done', label: 'Terminé' }];

describe('TaskCardMenu (MAIR-859)', () => {
  it('opens, moves by keyboard to another column and deletes', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn(); const onMove = vi.fn(); const onDelete = vi.fn();
    render(<TaskCardMenu title="Audit" column="todo" columns={columns} onOpen={onOpen} onMove={onMove} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: 'Actions pour Audit' }));
    expect(screen.getByRole('menuitemradio', { name: 'À faire' }).getAttribute('aria-checked')).toBe('true');
    screen.getByRole('menuitemradio', { name: 'Terminé' }).focus();
    await user.keyboard('{Enter}');
    expect(onMove).toHaveBeenCalledWith('done');
    await user.click(screen.getByRole('button', { name: 'Actions pour Audit' }));
    await user.click(screen.getByRole('menuitem', { name: 'Ouvrir la tâche' }));
    expect(onOpen).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Actions pour Audit' }));
    await user.click(screen.getByRole('menuitem', { name: 'Supprimer la tâche' }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('offers no move nor deletion without the rights', async () => {
    const user = userEvent.setup();
    render(<TaskCardMenu title="Audit" column="todo" columns={columns} onOpen={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Actions pour Audit' }));
    expect(screen.queryByRole('menuitemradio')).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Supprimer la tâche' })).toBeNull();
  });
});
