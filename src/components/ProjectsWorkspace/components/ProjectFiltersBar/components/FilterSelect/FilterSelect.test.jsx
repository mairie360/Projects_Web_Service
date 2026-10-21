import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilterSelect } from './FilterSelect';

describe('FilterSelect', () => {
  it('opens on click and reports the chosen option', async () => {
    const onOpenChange = vi.fn(); const onChange = vi.fn();
    const options = [{ label: 'Tous les statuts', value: 'all' }, ...statusOptions];
    const { rerender } = render(<FilterSelect label="Statut" value="all" options={options} open={false} onOpenChange={onOpenChange} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tous les statuts' }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    rerender(<FilterSelect label="Statut" value="all" options={options} open onOpenChange={onOpenChange} onChange={onChange} />);
    await userEvent.click(screen.getByRole('option', { name: 'En cours' }));
    expect(onChange).toHaveBeenCalledWith('in-progress');
  });
});
