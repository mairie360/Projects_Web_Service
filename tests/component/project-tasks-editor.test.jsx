import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ProjectTasksEditor } from '@/components/project/ProjectTasksEditor';
import { createProjectFormState } from '@/lib/projectPageState';

const memberOptions = [
  { label: 'Alice Martin', name: 'Alice Martin', value: '2' },
  { label: 'Marie Durand', name: 'Marie Durand', value: '3' },
];

function Editor({ responsible = '' }) {
  const [form, setForm] = React.useState(() => ({ ...createProjectFormState(), responsible }));

  return (
    <>
      <button type="button" onClick={() => setForm((current) => ({ ...current, responsible: '3' }))}>
        Choisir Marie pour le projet
      </button>
      <ProjectTasksEditor
        form={form}
        memberOptions={memberOptions}
        labelOptions={[]}
        statusOptions={[{ label: 'À faire', value: 'todo' }]}
        priorityOptions={[{ label: 'Moyenne', value: 'medium' }]}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
      />
      <output data-testid="tasks">{JSON.stringify(form.taskItems)}</output>
    </>
  );
}

describe('ProjectTasksEditor task assignees', () => {
  it('stacks a long task heading above its mobile edit action and preserves the full title on edit', async () => {
    const user = userEvent.setup();
    const title = 'ValiderLePlanDesNouveauxEspaces'.repeat(3);
    render(<Editor responsible="3" />);
    await user.type(screen.getByPlaceholderText('Ajouter une tâche...'), title);
    await user.click(screen.getByRole('button', { name: 'Ajouter la tâche' }));

    const heading = screen.getByRole('heading', { name: title });
    expect(heading.className).toContain('[overflow-wrap:anywhere]');
    expect(heading.parentElement.className).toContain('flex-col');
    expect(heading.parentElement.className).toContain('sm:flex-row');
    await user.click(within(heading.closest('article')).getByRole('button', { name: 'Modifier' }));
    expect(screen.getByPlaceholderText('Ajouter une tâche...').value).toBe(title);
    expect(JSON.parse(screen.getByTestId('tasks').textContent)[0].title).toBe(title);
  });

  it('refuses to create a task without an explicit assignee or project responsible', async () => {
    const user = userEvent.setup();
    render(<Editor />);

    await user.type(screen.getByPlaceholderText('Ajouter une tâche...'), 'Préparer le dossier');
    await user.click(screen.getByRole('button', { name: 'Ajouter la tâche' }));

    expect(screen.getByText('Choisissez un assigné pour la tâche ou un responsable pour le projet.')).toBeTruthy();
    expect(screen.getByTestId('tasks').textContent).toBe('[]');
    expect(screen.queryByText('1 sélectionné(s)')).toBeNull();
  });

  it('uses the actual project responsible after selection, never the first member', async () => {
    const user = userEvent.setup();
    render(<Editor />);

    await user.type(screen.getByPlaceholderText('Ajouter une tâche...'), 'Préparer le dossier');
    await user.click(screen.getByRole('button', { name: 'Choisir Marie pour le projet' }));
    expect(screen.getByText('Sans choix, le responsable du projet sera assigné à cette tâche.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Ajouter la tâche' }));

    const [task] = JSON.parse(screen.getByTestId('tasks').textContent);
    expect(task.responsible).toMatchObject({ id: '3', name: 'Marie Durand' });
    expect(task.assignees).toEqual([expect.objectContaining({ id: '3' })]);
    expect(task.title).toBe('Préparer le dossier');
  });

  it('preserves an explicit task assignee even when the project has another responsible', async () => {
    const user = userEvent.setup();
    render(<Editor responsible="3" />);

    await user.type(screen.getByPlaceholderText('Ajouter une tâche...'), 'Vérifier le dossier');
    await user.click(screen.getByRole('button', { name: 'Assignés' }));
    await user.click(screen.getByRole('option', { name: 'Alice Martin' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter la tâche' }));

    const [task] = JSON.parse(screen.getByTestId('tasks').textContent);
    expect(task.responsible).toMatchObject({ id: '2', name: 'Alice Martin' });
    expect(task.assignees).toEqual([expect.objectContaining({ id: '2' })]);
    expect(screen.getByPlaceholderText('Ajouter une tâche...').value).toBe('');
    expect(screen.queryByText('1 sélectionné(s)')).toBeNull();
  });
});
