import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { task } from '@tests/component/units/project-fixtures';
import { DraftTaskRow } from './DraftTaskRow';

describe('DraftTaskRow', () => {
  it('toggles and edits the draft task', async () => {
    const onToggle = vi.fn(); const onEdit = vi.fn();
    render(<DraftTaskRow task={task()} onToggle={onToggle} onEdit={onEdit} />);
    expect(screen.getByText('À faire')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Marquer Relevé des candélabres comme terminée' }));
    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(onToggle).toHaveBeenCalledTimes(1); expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
