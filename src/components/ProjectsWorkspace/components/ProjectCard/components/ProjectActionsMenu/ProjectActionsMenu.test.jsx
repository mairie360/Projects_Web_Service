import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectActionsMenu } from './ProjectActionsMenu';

describe('ProjectActionsMenu', () => {
  it('opens the menu and edits the project', async () => {
    const onEdit = vi.fn(); const item = { title: 'Projet clavier', permissions: { canEdit: true } };
    render(<ProjectActionsMenu project={item} onEdit={onEdit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions pour Projet clavier' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Modifier' }));
    expect(onEdit).toHaveBeenCalledWith(item);
  });
});
