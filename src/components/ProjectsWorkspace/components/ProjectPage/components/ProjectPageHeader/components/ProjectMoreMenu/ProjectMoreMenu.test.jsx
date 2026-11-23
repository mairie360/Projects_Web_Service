import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectMoreMenu } from './ProjectMoreMenu';

describe('ProjectMoreMenu (MAIR-846, Figma 5.8)', () => {
  it('renders nothing without any allowed action', () => {
    const { container } = render(<ProjectMoreMenu title="Projet" />);
    expect(container.innerHTML).toBe('');
  });

  it('keeps a duplication under verification disabled', async () => {
    const user = userEvent.setup(); const onDuplicate = vi.fn();
    render(<ProjectMoreMenu title="Projet" onDuplicate={onDuplicate} duplicateDisabled duplicateLabel="Copie à vérifier" onDelete={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Plus d’actions pour Projet' }));
    expect(screen.getByRole('menuitem', { name: 'Copie à vérifier' }).disabled).toBe(true);
    expect(screen.getByRole('menuitem', { name: 'Supprimer' })).toBeTruthy();
  });

  it('offers « Modifier » first (MAIR-1134 C14)', async () => {
    const onEdit = vi.fn();
    render(<ProjectMoreMenu title="Voirie" onEdit={onEdit} onDuplicate={vi.fn()} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Plus d’actions pour Voirie' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Modifier', 'Dupliquer', 'Supprimer']);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Modifier' }));
    expect(onEdit).toHaveBeenCalled();
  });
});
