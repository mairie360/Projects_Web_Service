import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import fixtures from '@tests/support/bff-fixtures.cjs';
import { TaskComposer } from './TaskComposer';

describe('TaskComposer', () => {
  it('opens the quick form, refuses an empty title and adds a titled task', async () => {
    const item = fixtures.projectListItem({ permissions: { canCreateTask: true } }); const onAddTask = vi.fn().mockResolvedValue(undefined);
    render(<TaskComposer project={item} onAddTask={onAddTask} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter une tâche' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(screen.getByRole('alert').textContent).toBe('Le titre de la tâche est obligatoire.');
    await userEvent.type(screen.getByLabelText('Titre de la tâche'), 'Relevé');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(onAddTask).toHaveBeenCalledTimes(1);
    expect(onAddTask.mock.calls[0][1].title).toBe('Relevé');
  });
  it('renders nothing without an add handler', () => {
    const { container } = render(<TaskComposer project={fixtures.projectListItem()} />);
    expect(container.innerHTML).toBe('');
  });
});
