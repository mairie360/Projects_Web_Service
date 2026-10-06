import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProjectTasksEditor } from '@/components/project/ProjectTasksEditor';
import { createProjectFormState } from '@/lib/projectPageState';
import fixtures from '../support/bff-fixtures.cjs';

const memberOptions = [
  { label: 'Alice Martin', name: 'Alice Martin', value: '2' },
  { label: 'Marie Durand', name: 'Marie Durand', value: '3' },
];

function Editor({ responsible = '', taskItems = [], dueDate = '' }) {
  const [form, setForm] = React.useState(() => ({ ...createProjectFormState(), responsible, taskItems, dueDate }));

  return (
    <>
      <button type="button" onClick={() => setForm((current) => ({ ...current, responsible: '3' }))}>
        Choisir Marie pour le projet
      </button>
      <input
        aria-label="Échéance du projet de test"
        type="date"
        value={form.dueDate}
        onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
      />
      <ProjectTasksEditor
        form={form}
        memberOptions={memberOptions}
        labelOptions={[]}
        statusOptions={[{ label: 'À faire', value: 'todo' }]}
        priorityOptions={[{ label: 'Moyenne', value: 'medium' }]}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
      />
      <output data-testid="tasks">{JSON.stringify(form.taskItems)}</output>
      <output data-testid="task-summary">{JSON.stringify({ total: form.totalTasks, completed: form.completedTasks, progress: form.progress })}</output>
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

describe('ProjectTasksEditor local task identities', () => {
  afterEach(() => vi.restoreAllMocks());

  const tasks = () => JSON.parse(screen.getByTestId('tasks').textContent);
  const addTask = async (user, title) => {
    await user.type(screen.getByPlaceholderText('Ajouter une tâche...'), title);
    await user.click(screen.getByRole('button', { name: 'Ajouter la tâche' }));
  };

  it('keeps same-tick drafts independently toggleable and editable with stable identities and dates', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1791290000000);
    const user = userEvent.setup();
    render(<Editor responsible="3" />);
    await addTask(user, 'Première tâche');
    await addTask(user, 'Deuxième tâche');
    const original = tasks();
    expect(new Set(original.map(task => task.id)).size).toBe(2);
    await user.click(screen.getByRole('button', { name: 'Marquer Première tâche comme terminée' }));
    expect(tasks().map(task => task.completed)).toEqual([true, false]);
    expect(JSON.parse(screen.getByTestId('task-summary').textContent)).toEqual({ total: 2, completed: 1, progress: 50 });
    await user.click(within(screen.getByRole('heading', { name: 'Deuxième tâche' }).closest('article'))
      .getByRole('button', { name: 'Modifier' }));
    await user.clear(screen.getByPlaceholderText('Ajouter une tâche...'));
    await user.type(screen.getByPlaceholderText('Ajouter une tâche...'), 'Deuxième tâche corrigée');
    await user.click(screen.getByRole('button', { name: 'Enregistrer la tâche' }));
    const edited = tasks();
    expect(edited[0]).toEqual({ ...original[0], completed: true, status: 'done' });
    expect(edited[1]).toEqual({ ...original[1], title: 'Deuxième tâche corrigée' });
    expect(edited.map(task => task.id)).toEqual(original.map(task => task.id));
  });

  it('avoids matching existing identities and previously allocated suffixes without rewriting those tasks', async () => {
    const user = userEvent.setup();
    render(<Editor responsible="3" />);
    vi.spyOn(Date, 'now').mockReturnValue(1791290000000);
    await addTask(user, 'Première tâche');
    await addTask(user, 'Deuxième tâche');
    await addTask(user, 'Troisième tâche');
    const before = tasks();
    expect(new Set(before.map(task => task.id)).size).toBe(3);
    await addTask(user, 'Quatrième tâche');
    expect(new Set(tasks().map(task => task.id)).size).toBe(4);
    expect(tasks().slice(0, 3)).toEqual(before);
  });

  it('stays unique when the clock moves backwards and later returns to an occupied timestamp', async () => {
    const user = userEvent.setup();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1791290000100);
    render(<Editor responsible="3" />);
    await addTask(user, 'Avant recul');
    clock.mockReturnValue(1791290000000);
    await addTask(user, 'Après recul');
    const before = tasks();
    clock.mockReturnValue(1791290000100);
    await addTask(user, 'Horloge revenue');
    expect(new Set(tasks().map(task => task.id)).size).toBe(3);
    expect(tasks().slice(0, 2)).toEqual(before);
  });

  it('does not reuse existing project-task IDs that match the local base and suffix', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1791290000000);
    const existing = [
      fixtures.projectTask({ id: 'task-1791290000000', title: 'Tâche existante' }),
      fixtures.projectTask({ id: 'task-1791290000000-1', title: 'Autre tâche existante' }),
    ];
    const user = userEvent.setup();
    render(<Editor responsible="3" taskItems={existing} />);
    await addTask(user, 'Tâche ajoutée');
    expect(new Set(tasks().map(task => task.id)).size).toBe(3);
    expect(tasks().slice(0, 2)).toEqual(existing);
    expect(tasks()[2].id).not.toBe(existing[0].id);
    expect(tasks()[2].id).not.toBe(existing[1].id);
  });
});

describe('ProjectTasksEditor deadline ownership', () => {
  const projectDate = () => screen.getByLabelText('Échéance du projet de test');
  const taskDate = () => screen.getByLabelText('Échéance', { exact: true });
  const changeProjectDate = value => fireEvent.change(projectDate(), { target: { value } });
  const tasks = () => JSON.parse(screen.getByTestId('tasks').textContent);
  const addTask = async user => {
    await user.type(screen.getByPlaceholderText('Ajouter une tâche...'), 'Échéance reçue du projet');
    await user.click(screen.getByRole('button', { name: 'Ajouter la tâche' }));
  };

  it('follows the final project date instead of retaining an intermediate native year', async () => {
    const user = userEvent.setup();
    render(<Editor responsible="3" />);
    for (const value of ['0002-11-18', '0020-11-18', '0202-11-18', '2026-11-18']) changeProjectDate(value);
    expect(taskDate().value).toBe('2026-11-18');
    await addTask(user);
    expect(tasks()[0].dueDate).toBe('2026-11-18');
  });

  it('keeps a new deadline unchosen even when another draft field already contains text', async () => {
    const user = userEvent.setup();
    render(<Editor responsible="3" dueDate="2026-11-18" />);
    await user.type(screen.getByPlaceholderText('Ajouter une tâche...'), 'Texte conservé');
    changeProjectDate('2026-12-31');
    expect(screen.getByPlaceholderText('Ajouter une tâche...').value).toBe('Texte conservé');
    expect(taskDate().value).toBe('2026-12-31');
    await user.click(screen.getByRole('button', { name: 'Ajouter la tâche' }));
    expect(tasks()[0]).toMatchObject({ title: 'Texte conservé', dueDate: '2026-12-31' });
  });

  it('preserves an explicitly chosen task date when the project date changes', async () => {
    const user = userEvent.setup();
    render(<Editor responsible="3" dueDate="2026-11-18" />);
    fireEvent.change(taskDate(), { target: { value: '2026-10-21' } });
    changeProjectDate('2026-12-31');
    expect(taskDate().value).toBe('2026-10-21');
    await addTask(user);
    expect(tasks()[0].dueDate).toBe('2026-10-21');
  });

  it('preserves an explicitly cleared task date rather than replacing it with a project default', async () => {
    const user = userEvent.setup();
    render(<Editor responsible="3" dueDate="2026-11-18" />);
    fireEvent.change(taskDate(), { target: { value: '' } });
    changeProjectDate('2026-12-31');
    expect(taskDate().value).toBe('');
    await addTask(user);
    expect(tasks()[0].dueDate).toBe('');
  });

  for (const dueDate of ['', '2026-10-21']) {
    it(`editing an existing task retains its own ${dueDate ? 'chosen' : 'blank'} date and identity`, async () => {
      const user = userEvent.setup();
      const existing = fixtures.projectTask({ id: 'existing-date-task', title: 'Tâche existante', dueDate });
      render(<Editor responsible="3" dueDate="2026-11-18" taskItems={[existing]} />);
      await user.click(within(screen.getByRole('heading', { name: 'Tâche existante' }).closest('article'))
        .getByRole('button', { name: 'Modifier' }));
      changeProjectDate('2026-12-31');
      expect(taskDate().value).toBe(dueDate);
      await user.clear(screen.getByPlaceholderText('Ajouter une tâche...'));
      await user.type(screen.getByPlaceholderText('Ajouter une tâche...'), 'Tâche existante corrigée');
      await user.click(screen.getByRole('button', { name: 'Enregistrer la tâche' }));
      // This case verifies date/identity ownership, not unrelated receipt labels
      // or the existing assignee-order normalization.
      expect(tasks()[0]).toMatchObject({
        id: existing.id, title: 'Tâche existante corrigée',
        dueDate, createdAt: existing.createdAt,
      });
    });
  }

  it('canceling an existing edit creates a fresh unchosen date without changing the existing task', async () => {
    const user = userEvent.setup();
    const existing = fixtures.projectTask({ id: 'existing-cancel-task', title: 'Tâche conservée', dueDate: '2026-10-21' });
    render(<Editor responsible="3" dueDate="2026-11-18" taskItems={[existing]} />);
    await user.click(within(screen.getByRole('heading', { name: 'Tâche conservée' }).closest('article'))
      .getByRole('button', { name: 'Modifier' }));
    changeProjectDate('2026-12-31');
    await user.click(screen.getByRole('button', { name: 'Annuler', exact: true }));
    changeProjectDate('2027-01-01');
    expect(taskDate().value).toBe('2027-01-01');
    await addTask(user);
    expect(tasks()[0]).toEqual(existing);
    expect(tasks()[1].dueDate).toBe('2027-01-01');
  });
});
