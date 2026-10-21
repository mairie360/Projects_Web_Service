import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
const statuses = [{ id: 'd1', name: 'À faire', color: '#1256a6', category: 'todo' }, { id: 'd2', name: 'En cours', color: '#4b908d', category: 'inprogress' }, { id: 'd3', name: 'Terminé', color: '#267845', category: 'done' }];
import { StatusDefinitionEditor } from './StatusDefinitionEditor';

describe('StatusDefinitionEditor', () => {
  it('adds a status to the definition', async () => {
    const onChange = vi.fn();
    render(<StatusDefinitionEditor statuses={statuses} onChange={onChange} />);
    expect(screen.getByText('Définition des statuts')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un statut' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(4);
  });
});
