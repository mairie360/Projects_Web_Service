import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskComposer } from '@/components/project-card/TaskComposer';
import fixtures from '../support/bff-fixtures.cjs';

async function openComposer() {
  const user = userEvent.setup(), project = fixtures.projectListItem(), page = fixtures.projectsPage();
  const onAddTask = vi.fn().mockResolvedValue(undefined);
  render(<TaskComposer project={project} memberOptions={page.options.members} labelOptions={page.options.labels} onAddTask={onAddTask} />);
  await user.click(screen.getByRole('button', { name: 'Ajouter une tâche', exact: true }));
  const form = screen.getByRole('form', { name: 'Créer une tâche', exact: true });
  const scope = within(form);
  // The legacy count name allows focus regressions to reach their assertion before the naming fix.
  const members = scope.getByRole('button', { name: /^(Assignés|1 sélectionné\(s\))$/ });
  const labels = scope.getByRole('button', { name: 'Étiquettes', exact: true });
  return { user, scope, members, labels, onAddTask, project };
}

describe('Inline task picker keyboard navigation', () => {
  it('retains distinct field names when both pickers show the same selected count and sends the actual selections once', async () => {
    const { user, scope, members, labels, onAddTask, project } = await openComposer();
    await user.type(scope.getByRole('textbox', { name: 'Titre de la tâche', exact: true }), 'Tâche avec sélections');
    await user.click(labels);
    await user.click(scope.getByRole('option', { name: 'voirie', exact: true }));
    expect(scope.getByRole('button', { name: 'Assignés', exact: true })).toBe(members);
    expect(scope.getByRole('button', { name: 'Étiquettes', exact: true })).toBe(labels);
    expect(members.textContent).toContain('1 sélectionné(s)');
    expect(labels.textContent).toContain('1 sélectionné(s)');
    await user.click(members);
    await user.click(scope.getByRole('option', { name: 'Admin Mairie', exact: true }));
    expect(scope.getByRole('button', { name: 'Assignés', exact: true }).textContent).toContain('2 sélectionné(s)');
    await user.click(scope.getByRole('textbox', { name: 'Titre de la tâche', exact: true }));
    await user.click(scope.getByRole('button', { name: 'Ajouter', exact: true }));
    expect(onAddTask).toHaveBeenCalledOnce();
    expect(onAddTask.mock.calls[0][0]).toBe(project);
    expect(onAddTask.mock.calls[0][1]).toMatchObject({ title: 'Tâche avec sélections', labels: ['voirie'], status: project.status, priority: project.priority, dueDate: project.dueDate });
    expect(onAddTask.mock.calls[0][1].assignees.map(person => person.id)).toEqual(['3', '1']);
  });

  it.each([['members', 'Admin Mairie'], ['labels', 'voirie']])('returns Escape focus to the %s opener without saving or losing the draft', async (field, optionName) => {
    const values = await openComposer(), { user, scope, onAddTask } = values;
    const opener = values[field];
    const title = scope.getByRole('textbox', { name: 'Titre de la tâche', exact: true });
    await user.type(title, 'Brouillon clavier conservé');
    await user.click(opener);
    const option = scope.getByRole('option', { name: optionName, exact: true });
    option.focus();
    await user.keyboard('{Enter}');
    expect(option.getAttribute('aria-selected')).toBe('true');
    await user.keyboard('{Escape}');
    expect(scope.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(opener.getAttribute('aria-expanded')).toBe('false');
    expect(title.value).toBe('Brouillon clavier conservé');
    expect(onAddTask).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(scope.getByRole('option', { name: optionName, exact: true }).getAttribute('aria-selected')).toBe('true');
  });

  it('does not steal focus when Escape is pressed outside a picker or when an outside field is clicked', async () => {
    const { user, scope, members, onAddTask } = await openComposer();
    const title = scope.getByRole('textbox', { name: 'Titre de la tâche', exact: true });
    const priority = scope.getByRole('combobox', { name: 'Priorité', exact: true });
    await user.type(title, 'Brouillon hors menu');
    await user.click(members);
    priority.focus();
    await user.keyboard('{Escape}');
    expect(scope.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(priority);
    await user.click(members);
    await user.click(title);
    expect(scope.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(title);
    expect(title.value).toBe('Brouillon hors menu');
    expect(onAddTask).not.toHaveBeenCalled();
  });

  it('restores only the focused picker when two menus were opened without a pointer outside click', async () => {
    const { user, scope, members, labels, onAddTask } = await openComposer();
    members.focus(); await user.keyboard('{Enter}');
    labels.focus(); await user.keyboard('{Enter}');
    expect(scope.getAllByRole('listbox')).toHaveLength(2);
    const labelOption = within(scope.getByRole('listbox', { name: 'Étiquettes', exact: true })).getByRole('option', { name: 'voirie', exact: true });
    labelOption.focus(); await user.keyboard('{Escape}');
    expect(scope.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(labels);
    expect(onAddTask).not.toHaveBeenCalled();
  });
});
