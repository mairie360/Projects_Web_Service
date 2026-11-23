import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import fixtures from '@tests/support/bff-fixtures.cjs';
import { TableView, sortProjects } from './TableView';

const handlers = () => ({ onProjectOpen: vi.fn(), onProjectDuplicate: vi.fn(), onProjectDelete: vi.fn() });
const selection = (selected = new Set()) => ({ selectedProjectIds: selected, onSelectionChange: vi.fn(), onClearSelection: vi.fn(), onDeleteSelection: vi.fn() });

describe('TableView', () => {
  it('lists the projects with their columns', async () => {
    const item = fixtures.projectListItem(); const props = handlers();
    render(<TableView projects={[item]} {...props} />);
    expect(screen.getByRole('columnheader', { name: 'Projet' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: `Ouvrir la fiche du projet ${item.title}` }));
    expect(props.onProjectOpen).toHaveBeenCalledWith(item);
  });
});

describe('TableView V2 (MAIR-833)', () => {
  it('shows the V2 columns: key, project with labels, status, priority, responsible, due date or « En retard », progress', () => {
    const late = fixtures.projectListItem({ id: 'project-8', dueDate: '2020-01-01', status: 'in-progress', labels: ['Voirie'] });
    render(<TableView projects={[late]} {...handlers()} {...selection()} />);
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers.slice(1)).toEqual(['Clé', 'Projet', 'Statut', 'Priorité', 'Responsable', 'Échéance', 'Progression', 'Actions']);
    const row = screen.getAllByRole('row')[1];
    expect(within(row).getByText('#8')).toBeTruthy();
    expect(within(row).getByText('En retard')).toBeTruthy();
    expect(within(row).getByRole('list', { name: 'Étiquettes du projet' }).textContent).toContain('Voirie');
    expect(within(row).getByText(late.responsible.name)).toBeTruthy();
  });

  it('selects a row without opening it and marks it selected', async () => {
    const item = fixtures.projectListItem(); const props = { ...handlers(), ...selection(new Set([item.id])) };
    render(<TableView projects={[item]} {...props} />);
    const checkbox = screen.getByRole('checkbox', { name: `Sélectionner ${item.title}` });
    expect(checkbox.checked).toBe(true);
    expect(screen.getAllByRole('row')[1].dataset.selected).toBe('true');
    await userEvent.click(checkbox);
    expect(props.onSelectionChange).toHaveBeenCalledWith([item.id], false);
    expect(props.onProjectOpen).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('1 projet sélectionné');
  });

  it('« Tout sélectionner » is mixed for a partial selection and skips projects that cannot be deleted', async () => {
    const one = fixtures.projectListItem({ id: 'project-1' });
    const two = fixtures.projectListItem({ id: 'project-2', title: 'Deux' });
    const locked = fixtures.projectListItem({ id: 'project-3', title: 'Verrouillé', permissions: { ...one.permissions, canDelete: false } });
    const props = { ...handlers(), ...selection(new Set(['project-1'])) };
    render(<TableView projects={[one, two, locked]} {...props} />);
    const all = screen.getByRole('checkbox', { name: 'Tout sélectionner' });
    expect(all.indeterminate).toBe(true);
    expect(screen.getByRole('checkbox', { name: 'Sélectionner Verrouillé' }).disabled).toBe(true);
    await userEvent.click(all);
    expect(props.onSelectionChange).toHaveBeenCalledWith(['project-1', 'project-2'], true);
  });

  it('sorts the page by a column, both directions', async () => {
    const items = [
      fixtures.projectListItem({ id: 'project-1', title: 'Bêta', progress: 90 }),
      fixtures.projectListItem({ id: 'project-2', title: 'alpha', progress: 10 }),
    ];
    render(<TableView projects={items} {...handlers()} />);
    const titles = () => screen.getAllByRole('button', { name: /^Ouvrir la fiche du projet / }).map((button) => button.textContent);
    expect(titles()).toEqual(['Bêta', 'alpha']);
    await userEvent.click(within(screen.getByRole('columnheader', { name: /Projet/ })).getByRole('button'));
    expect(titles()).toEqual(['alpha', 'Bêta']);
    await userEvent.click(within(screen.getByRole('columnheader', { name: /Projet/ })).getByRole('button'));
    expect(titles()).toEqual(['Bêta', 'alpha']);
  });

  it('keeps projects without a due date last in both directions', () => {
    const none = fixtures.projectListItem({ id: 'project-1', dueDate: '' });
    const soon = fixtures.projectListItem({ id: 'project-2', dueDate: '2026-12-01' });
    const later = fixtures.projectListItem({ id: 'project-3', dueDate: '2027-06-01' });
    expect(sortProjects([none, later, soon], { key: 'dueDate', direction: 'asc' }).map((p) => p.id)).toEqual(['project-2', 'project-3', 'project-1']);
    expect(sortProjects([none, soon, later], { key: 'dueDate', direction: 'desc' }).map((p) => p.id)).toEqual(['project-3', 'project-2', 'project-1']);
  });

  it('follows the business orders and keeps an empty responsible last (MAIR-1138)', () => {
    const done = fixtures.projectListItem({ id: 'project-1', status: 'done', priority: 'low' });
    const todo = fixtures.projectListItem({ id: 'project-2', status: 'todo', priority: 'high' });
    const review = fixtures.projectListItem({ id: 'project-3', status: 'review', priority: 'medium', responsible: { name: '' } });
    const ids = (sort) => sortProjects([done, review, todo], sort).map((p) => p.id);
    expect(ids({ key: 'status', direction: 'asc' })).toEqual(['project-2', 'project-3', 'project-1']);
    expect(ids({ key: 'status', direction: 'desc' })).toEqual(['project-1', 'project-3', 'project-2']);
    expect(ids({ key: 'priority', direction: 'asc' })).toEqual(['project-2', 'project-3', 'project-1']);
    expect(ids({ key: 'responsible', direction: 'asc' }).at(-1)).toBe('project-3');
    expect(ids({ key: 'responsible', direction: 'desc' }).at(-1)).toBe('project-3');
  });
});
