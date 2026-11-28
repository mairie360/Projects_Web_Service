import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, priorityOptions, project, statusOptions, task } from '@tests/component/units/project-fixtures';
import { ProjectPage } from './ProjectPage';

const handlers = () => ({ onUpdateProject: vi.fn(), onAddTask: vi.fn(), onUpdateTask: vi.fn(), onUpdateTaskStatus: vi.fn(), onDeleteTask: vi.fn(), onCloseProject: vi.fn() });
const base = { tasks: [task()], memberOptions, labelOptions: [], statusOptions, priorityOptions };
const editable = { canEdit: true, canDuplicate: true, canDelete: true, canCreateTask: true, canClose: true };

// MAIR-846 (Figma F5): the project page replaces the project dialog.
describe('ProjectPage', () => {
  it('shows the breadcrumb, header, metrics and tabs of the mockup, on « Vue d’ensemble »', () => {
    render(<ProjectPage project={project({ permissions: editable })} {...base} onClose={vi.fn()} {...handlers()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Fil d’Ariane' }).textContent).toMatch(/PRJ-\d+/);
    expect(screen.getByRole('heading', { level: 1, name: 'Rénovation de l’éclairage public' })).toBeTruthy();
    for (const label of ['Avancement', 'Échéance', 'Budget engagé', 'Tâches en retard']) expect(within(screen.getByRole('region', { name: 'Indicateurs du projet' })).getByText(label)).toBeTruthy();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Vue d’ensemble', 'Tâches1', 'Planning', 'Équipe2', 'Documents', 'Activité']);
    expect(screen.getByRole('tab', { name: 'Vue d’ensemble' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Prochaines tâches')).toBeTruthy();
    for (const name of ['Modifier', 'Nouvelle tâche']) expect(screen.getByRole('button', { name })).toBeTruthy();
  });

  it('goes back to the list from « ← Projets » and keeps the tasks mounted across tabs', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ProjectPage project={project({ permissions: editable })} {...base} onClose={onClose} {...handlers()} />);
    // MAIR-859 (C5): « Nouvelle tâche » opens « Tâches » and the empty task sheet, focused on its title.
    await user.click(screen.getByRole('button', { name: 'Nouvelle tâche' }));
    expect(screen.getByRole('tab', { name: /^Tâches/ }).getAttribute('aria-selected')).toBe('true');
    const sheet = screen.getByRole('dialog', { name: 'Nouvelle tâche' });
    expect(document.activeElement).toBe(within(sheet).getByLabelText(/^Titre/));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Nouvelle tâche' })).toBeNull();
    const search = within(screen.getByRole('tabpanel')).getByRole('searchbox', { name: 'Rechercher une tâche' });
    await user.type(search, 'Brouillon gardé');
    await user.click(screen.getByRole('tab', { name: 'Équipe2' }));
    expect(within(screen.getByRole('tabpanel')).getByText('Aucun membre')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: /^Tâches/ }));
    expect(within(screen.getByRole('tabpanel')).getByRole('searchbox', { name: 'Rechercher une tâche' }).value).toBe('Brouillon gardé');
    await user.click(screen.getByRole('button', { name: 'Projets' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('changes the status from the pill, duplicates and deletes from « … »', async () => {
    const user = userEvent.setup();
    const onChangeStatus = vi.fn(); const onDuplicate = vi.fn(); const onDelete = vi.fn();
    const shown = project({ permissions: editable });
    render(<ProjectPage project={shown} {...base} onClose={vi.fn()} {...handlers()} onChangeStatus={onChangeStatus} onDuplicate={onDuplicate} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: 'Statut : En cours. Changer le statut' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'En revue' }));
    expect(onChangeStatus).toHaveBeenCalledWith(shown, 'review');
    await user.click(screen.getByRole('button', { name: `Plus d’actions pour ${shown.title}` }));
    await user.click(screen.getByRole('menuitem', { name: 'Dupliquer' }));
    expect(onDuplicate).toHaveBeenCalledWith(shown);
    await user.click(screen.getByRole('button', { name: `Plus d’actions pour ${shown.title}` }));
    await user.click(screen.getByRole('menuitem', { name: 'Supprimer' }));
    expect(onDelete).toHaveBeenCalledWith(shown);
  });

  it('hides the actions the permissions deny', () => {
    render(<ProjectPage project={project({ permissions: { canEdit: false, canDuplicate: false, canDelete: false, canCreateTask: false } })} {...base} onClose={vi.fn()} {...handlers()} onChangeStatus={vi.fn()} onDuplicate={vi.fn()} onDelete={vi.fn()} />);
    for (const name of ['Modifier', 'Nouvelle tâche', /^Plus d’actions/, /Changer le statut$/]) expect(screen.queryByRole('button', { name })).toBeNull();
  });

  it('edits the project in a size m modal with the group required (C7)', async () => {
    const user = userEvent.setup();
    const onUpdateProject = vi.fn();
    render(<ProjectPage project={project({ permissions: editable, group: null })} {...base} groupOptions={[{ value: 'group-1', label: 'Voirie' }]} onClose={vi.fn()} {...handlers()} onUpdateProject={onUpdateProject} />);
    expect(screen.getByText('Sans groupe')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    const dialog = screen.getByRole('dialog', { name: /^Modifier le projet · PRJ-\d+/ });
    // MAIR-1136 (C13): nothing changed yet, nothing to save.
    expect(within(dialog).getByRole('button', { name: 'Enregistrer (0)' }).disabled).toBe(true);
    await user.type(within(dialog).getByLabelText(/^Titre/), ' bis');
    expect(within(dialog).getByRole('region', { name: 'L’essentiel' }).textContent).toContain('Modifié');
    expect(within(dialog).getByRole('region', { name: 'Organisation' }).textContent).not.toContain('Modifié');
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer (1)' }));
    expect(within(dialog).getByText('Le groupe est obligatoire.')).toBeTruthy();
    expect(document.activeElement).toBe(document.getElementById('detail-project-group'));
    expect(onUpdateProject).not.toHaveBeenCalled();
    await user.selectOptions(within(dialog).getByLabelText(/^Groupe/), 'group-1');
    expect(within(dialog).queryByText('Le groupe est obligatoire.')).toBeNull();
    expect(within(dialog).getByLabelText(/^Groupe/).querySelector('option[value=""]')).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer (2)' }));
    expect(onUpdateProject).toHaveBeenCalledWith('project-1', expect.objectContaining({ groupId: 'group-1' }));
  });
});
