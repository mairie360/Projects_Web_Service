import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuickAddTask } from './QuickAddTask';

describe('QuickAddTask (MAIR-859 C3)', () => {
  it('requires a title, submits it trimmed on Entrée and cancels on Échap', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(); const onCancel = vi.fn();
    render(<QuickAddTask columnLabel="À faire" onSubmit={onSubmit} onCancel={onCancel} />);
    await user.keyboard('{Enter}');
    expect(screen.getByText('Donnez un titre à la tâche')).toBeTruthy();
    await user.type(screen.getByLabelText('Titre de la nouvelle tâche dans À faire'), '  Audit  {Enter}');
    expect(onSubmit).toHaveBeenCalledWith('Audit');
    expect(screen.queryByText('Donnez un titre à la tâche')).toBeNull();
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
  });

  it('sends nothing while a write runs', async () => {
    const onSubmit = vi.fn();
    render(<QuickAddTask columnLabel="À faire" pending onSubmit={onSubmit} onCancel={vi.fn()} />);
    expect(screen.getByLabelText('Titre de la nouvelle tâche dans À faire').disabled).toBe(true);
  });
});
