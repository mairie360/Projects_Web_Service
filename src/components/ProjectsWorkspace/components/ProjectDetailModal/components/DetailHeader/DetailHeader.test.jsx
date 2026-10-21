import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, person, priorityOptions, project, statusOptions, task } from '@tests/component/units/project-fixtures';
import { DetailHeader } from './DetailHeader';

describe('DetailHeader', () => {
  it('shows the edit toggle only when the project is editable', async () => {
    const onToggleEdit = vi.fn(); const onClose = vi.fn();
    const { rerender } = render(<DetailHeader project={project()} titleId="t" editing={false} editDisabled={false} closeDisabled={false} onToggleEdit={onToggleEdit} onClose={onClose} />);
    expect(screen.getByRole('heading', { name: 'Rénovation de l’éclairage public' }).getAttribute('id')).toBe('t');
    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fermer la fiche projet' }));
    expect(onToggleEdit).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<DetailHeader project={project({ permissions: { canEdit: false } })} titleId="t" editing={false} editDisabled={false} closeDisabled onToggleEdit={onToggleEdit} onClose={onClose} />);
    expect(screen.queryByRole('button', { name: 'Modifier' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Fermer la fiche projet' }).disabled).toBe(true);
  });
});
