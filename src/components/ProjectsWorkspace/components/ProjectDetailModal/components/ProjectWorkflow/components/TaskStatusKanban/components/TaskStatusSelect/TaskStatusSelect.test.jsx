import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskStatusSelect } from './TaskStatusSelect';

const statuses = [{ id: 'open', name: 'À faire', color: '#1256a6', category: 'todo' }, { id: 'closed', name: 'Terminé', color: '#267845', category: 'done' }];

describe('TaskStatusSelect', () => {
  it('reports a known status and locks an unknown one', () => {
    const onChange = vi.fn();
    const { rerender } = render(<TaskStatusSelect statuses={statuses} value="open" label="Statut" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Statut'), { target: { value: 'closed' } });
    expect(onChange).toHaveBeenCalledWith('closed');
    rerender(<TaskStatusSelect statuses={statuses} value="gone" label="Statut" onChange={onChange} />);
    expect(screen.getByLabelText('Statut').disabled).toBe(true);
    expect(screen.getByRole('option', { name: 'Statut indisponible' })).toBeTruthy();
  });
});
