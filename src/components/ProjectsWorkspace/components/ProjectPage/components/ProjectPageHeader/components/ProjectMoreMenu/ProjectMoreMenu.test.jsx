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
  it('MAIR-1181 links « Envoyer un message » to the messaging front, between Dupliquer and Supprimer', async () => {
    const user = userEvent.setup();
    render(<ProjectMoreMenu title="Voirie" onEdit={vi.fn()} onDuplicate={vi.fn()} messageHref="https://messages.test/?context=project-7" onDelete={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Plus d’actions pour Voirie' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Modifier', 'Dupliquer', 'Envoyer un message', 'Supprimer']);
    expect(screen.getByRole('menuitem', { name: 'Envoyer un message' }).getAttribute('href')).toBe('https://messages.test/?context=project-7');
  });

  it('MAIR-1181 shows the message entry alone and leaves it out without a messaging link', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ProjectMoreMenu title="Voirie" messageHref="https://messages.test/?context=project-7" />);
    await user.click(screen.getByRole('button', { name: 'Plus d’actions pour Voirie' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Envoyer un message']);
    unmount();
    render(<ProjectMoreMenu title="Voirie" onDuplicate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Plus d’actions pour Voirie' }));
    expect(screen.queryByRole('menuitem', { name: 'Envoyer un message' })).toBeNull();
  });
});
