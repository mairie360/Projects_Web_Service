import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AddMemberForm } from './AddMemberForm';

const roles = [{ value: 'manager', label: 'Responsable' }, { value: 'contributor', label: 'Contributeur' }];

describe('AddMemberForm (MAIR-874)', () => {
  it('adds the chosen agent as a contributor by default and empties the choice', async () => {
    const onAdd = vi.fn(async () => true);
    render(<AddMemberForm candidates={[{ label: 'Admin Mairie', value: 'user-1' }]} roleOptions={roles} pending={false} onAdd={onAdd} />);
    await userEvent.selectOptions(screen.getByLabelText(/^Agent/), 'user-1');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(onAdd).toHaveBeenCalledWith('user-1', 'contributor', 'Admin Mairie');
    expect(screen.getByLabelText(/^Agent/).value).toBe('');
  });

  it('says when every agent is already in the team', () => {
    render(<AddMemberForm candidates={[]} roleOptions={roles} pending={false} onAdd={vi.fn()} />);
    expect(screen.getByText('Tous les agents sont déjà dans l’équipe')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ajouter' }).disabled).toBe(true);
  });
});
