import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectionBar } from './SelectionBar';

describe('SelectionBar (MAIR-833)', () => {
  it('announces the count and offers « Désélectionner » and « Supprimer »', async () => {
    const onClear = vi.fn(), onDelete = vi.fn();
    render(<SelectionBar count={2} onClear={onClear} onDelete={onDelete} />);
    expect(screen.getByRole('status').textContent).toBe('2 projets sélectionnés');
    await userEvent.click(screen.getByRole('button', { name: 'Désélectionner' }));
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onClear).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('uses the singular for one project and renders nothing without a selection', () => {
    const { rerender, container } = render(<SelectionBar count={1} onClear={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toBe('1 projet sélectionné');
    rerender(<SelectionBar count={0} onClear={vi.fn()} onDelete={vi.fn()} />);
    expect(container.textContent).toBe('');
  });
});
