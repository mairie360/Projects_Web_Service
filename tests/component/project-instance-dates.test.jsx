import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstanceProvider } from '@mairie360/lib-components/react';
import { setInstanceTimeZone } from '@mairie360/lib-components/shared';
import { ProjectTasksEditor } from '@/components/ProjectsWorkspace/components/ProjectTasksEditor';
import { ProjectPage } from '@/components/ProjectsWorkspace/components/ProjectPage';
import { createProjectFormState } from '@/lib/projectPageState';
import { getTaskCollaboration } from '@/lib/bffProjectClient';
import fixtures from '../support/bff-fixtures.cjs';

vi.mock('@/lib/bffProjectClient', async original => ({ ...await original(), getTaskCollaboration: vi.fn(), getProjectGroups: vi.fn(async () => [{ id: 'group-1', name: 'Services techniques' }]), getProjectActivity: vi.fn(async () => ({ items: [], pagination: { page: 1, limit: 5, total: 0, hasNextPage: false } })) }));

const instance = children => <InstanceProvider timeZone="Indian/Reunion">{children}</InstanceProvider>;
beforeEach(() => { vi.stubEnv('TZ', 'Pacific/Honolulu'); vi.stubEnv('INSTANCE_TIMEZONE', 'Indian/Reunion'); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); setInstanceTimeZone('UTC'); });

function Editor() {
  const [form, setForm] = React.useState(() => ({ ...createProjectFormState(), responsible: 'user-3' }));
  const page = fixtures.projectsPage();
  return <>
    <ProjectTasksEditor form={form} memberOptions={page.options.members} labelOptions={page.options.labels}
      statusOptions={page.filters.statuses} priorityOptions={page.filters.priorities}
      onChange={patch => setForm(current => ({ ...current, ...patch }))} />
    <output aria-label="Tâches confirmées dans le formulaire">{JSON.stringify(form.taskItems)}</output>
  </>;
}

// The command runs this actual React tree with TZ=Pacific/Honolulu and
// INSTANCE_TIMEZONE=Indian/Reunion: the host date is still October 15 at midnight in the instance.
describe('project dates in the municipal instance timezone', () => {
  it.each([
    ['2026-10-15T19:59:59Z', '2026-10-15'],
    ['2026-10-15T20:00:00Z', '2026-10-16'],
  ])('creates a task at %s with the instance civil date %s', (instant, date) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(instant));
    expect(new Date().getDate()).toBe(15);
    render(instance(<Editor />));
    fireEvent.change(screen.getByPlaceholderText('Ajouter une tâche...'), { target: { value: 'Vérifier la permanence' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter la tâche' }));
    const [task] = JSON.parse(screen.getByLabelText('Tâches confirmées dans le formulaire').textContent);
    expect(task.createdAt).toBe(date);
  });

  it.each([
    ['2026-10-15T19:59:59Z', '15/10/2026 23:59:59'],
    ['2026-10-15T20:00:00Z', '16/10/2026 00:00:00'],
  ])('renders comment and history instants %s in the municipal timezone', async (instant, label) => {
    const receipt = fixtures.taskCollaboration();
    receipt.comments[0].createdAt = instant;
    receipt.history[0].createdAt = instant;
    vi.mocked(getTaskCollaboration).mockResolvedValue(receipt);
    const page = fixtures.projectsPage();
    render(instance(<ProjectPage initialTab="tasks" project={fixtures.projectListItem()} tasks={[fixtures.projectTask()]}
      memberOptions={page.options.members} labelOptions={page.options.labels} statusOptions={page.filters.statuses}
      priorityOptions={page.filters.priorities} onClose={vi.fn()} onUpdateProject={vi.fn()} onAddTask={vi.fn()}
      onUpdateTask={vi.fn()} onUpdateTaskStatus={vi.fn()} onDeleteTask={vi.fn()} onCloseProject={vi.fn()} />));
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: `Ouvrir la tâche ${fixtures.projectTask().title}` }));
    // MAIR-1137 (C15): the task page reads its follow-up as soon as it opens.
    expect(await screen.findByText(label, { selector: 'time' })).toBeTruthy();
    expect(screen.getByText(`Marie Durand · ${label}`)).toBeTruthy();
    expect(getTaskCollaboration).toHaveBeenLastCalledWith('project-1', 'task-1');
  });
});
