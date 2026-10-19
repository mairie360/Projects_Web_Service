import React from 'react';
import { expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskStatusKanban } from '@/components/project/TaskStatusKanban';
const statuses = [
  { id: 'pending', name: 'À instruire', color: '#1256a6', category: 'todo' },
  { id: 'review', name: 'Conseil municipal', color: '#4b908d', category: 'inprogress' },
  { id: 'closed', name: 'Dossier clos', color: '#267845', category: 'done' },
];
const task = (statusId = 'pending') => ({ id: 't1', title: 'Préparer le conseil', statusId, canUpdateStatus: true });
function SyncBoard() {
  const [statusId, setStatusId] = React.useState('pending');
  return <TaskStatusKanban statuses={statuses} tasks={[task(statusId)]} onStatusChange={(_id, value) => setStatusId(value)} />;
}
it('restores the native status selector focus after a controlled cross-column move and announces the new status', async () => {
  const user = userEvent.setup(); render(<SyncBoard />);
  const original = screen.getByRole('combobox', { name: 'Statut de Préparer le conseil' }); original.focus(); await user.selectOptions(original, 'closed');
  const moved = within(screen.getByRole('region', { name: 'Dossier clos' })).getByRole('combobox'); expect(moved).toBe(document.activeElement); expect(moved).not.toBe(original);
  expect(screen.getByRole('status').textContent).toBe('Préparer le conseil : Dossier clos');
});
it('does not steal focus when the user leaves the board before a delayed confirmed move', async () => {
  const user = userEvent.setup(); const onStatusChange = vi.fn();
  const { rerender } = render(<><TaskStatusKanban statuses={statuses} tasks={[task()]} onStatusChange={onStatusChange} /><button>Continuer ailleurs</button></>);
  const select = screen.getByRole('combobox'); select.focus(); fireEvent.change(select, { target: { value: 'closed' } });
  rerender(<><TaskStatusKanban statuses={statuses} tasks={[task()]} pending onStatusChange={onStatusChange} /><button>Continuer ailleurs</button></>);
  await user.click(screen.getByRole('button', { name: 'Continuer ailleurs' }));
  rerender(<><TaskStatusKanban statuses={statuses} tasks={[task('closed')]} onStatusChange={onStatusChange} /><button>Continuer ailleurs</button></>);
  expect(screen.getByRole('button', { name: 'Continuer ailleurs' })).toBe(document.activeElement); expect(screen.getByRole('combobox').value).toBe('closed');
});
it('forgets a refused move so a later external status update cannot resurrect its focus target', async () => {
  const onStatusChange = vi.fn(); const { rerender } = render(<TaskStatusKanban statuses={statuses} tasks={[task()]} onStatusChange={onStatusChange} />);
  const select = screen.getByRole('combobox'); select.focus(); fireEvent.change(select, { target: { value: 'closed' } });
  rerender(<TaskStatusKanban statuses={statuses} tasks={[task()]} pending onStatusChange={onStatusChange} />);
  rerender(<TaskStatusKanban statuses={statuses} tasks={[task()]} onStatusChange={onStatusChange} />);
  rerender(<TaskStatusKanban statuses={statuses} tasks={[task('closed')]} onStatusChange={onStatusChange} />);
  expect(screen.getByRole('combobox')).not.toBe(document.activeElement); expect(screen.getByRole('status').textContent).toBe('');
});
it('forgets a removed task and does not focus a later task that reuses its identifier', async () => {
  const onStatusChange = vi.fn(); const { rerender } = render(<TaskStatusKanban statuses={statuses} tasks={[task()]} onStatusChange={onStatusChange} />);
  const select = screen.getByRole('combobox'); select.focus(); fireEvent.change(select, { target: { value: 'closed' } });
  rerender(<TaskStatusKanban statuses={statuses} tasks={[]} pending onStatusChange={onStatusChange} />);
  rerender(<TaskStatusKanban statuses={statuses} tasks={[task('closed')]} onStatusChange={onStatusChange} />);
  expect(screen.getByRole('combobox')).not.toBe(document.activeElement); expect(screen.getByRole('status').textContent).toBe('');
});
it('restores focus after a delayed successful move when the user has stayed with that selector', async () => {
  const onStatusChange = vi.fn(); const { rerender } = render(<TaskStatusKanban statuses={statuses} tasks={[task()]} onStatusChange={onStatusChange} />);
  const select = screen.getByRole('combobox'); select.focus(); fireEvent.change(select, { target: { value: 'closed' } });
  rerender(<TaskStatusKanban statuses={statuses} tasks={[task()]} pending onStatusChange={onStatusChange} />);
  await act(async () => rerender(<TaskStatusKanban statuses={statuses} tasks={[task('closed')]} onStatusChange={onStatusChange} />));
  expect(screen.getByRole('combobox')).toBe(document.activeElement); expect(screen.getByRole('status').textContent).toBe('Préparer le conseil : Dossier clos');
});
