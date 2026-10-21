import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { KanbanBoard } from '@/components/ProjectsWorkspace/components/KanbanBoard';
import { statusConfig, priorityConfig } from '@/types/project';
import fixtures from '../support/bff-fixtures.cjs';

const columns = Object.entries(statusConfig).map(([status, presentation]) => ({ status, label: presentation.label }));
function transfer() {
  const values = new Map();
  return { setData: (name, value) => values.set(name, value), getData: name => values.get(name) ?? '', effectAllowed: '', dropEffect: '' };
}
function board(overrides = {}) {
  const project = fixtures.projectListItem({ status: 'todo', permissions: { canEdit: true } });
  const props = { projects: [project], columns, onMoveProject: vi.fn().mockResolvedValue(undefined), onProjectOpen: vi.fn(), ...overrides };
  render(<KanbanBoard {...props} />);
  return { props, project: props.projects[0], card: screen.getByRole('group', { name: props.projects[0].title }), target: screen.getByRole('region', { name: 'En cours' }) };
}
it('a pending move submits the original project once and keeps the card in its confirmed column', async () => {
  let finish;
  const move = vi.fn(() => new Promise(resolve => { finish = resolve; }));
  const { props, project, card, target } = board({ onMoveProject: move });
  const dataTransfer = transfer();
  fireEvent.pointerDown(card);
  fireEvent.dragStart(card, { dataTransfer });
  fireEvent.dragOver(target, { dataTransfer });
  expect(dataTransfer.dropEffect).toBe('move');
  fireEvent.drop(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });
  expect(move).toHaveBeenCalledTimes(1);
  expect(move).toHaveBeenCalledWith(project, 'in-progress');
  expect(card.getAttribute('aria-busy')).toBe('true');
  expect(screen.getByRole('region', { name: 'À faire' }).contains(card)).toBe(true);
  fireEvent.click(within(card).getByRole('button', { name: `Ouvrir la fiche du projet ${project.title}` }));
  expect(props.onProjectOpen).not.toHaveBeenCalled();
  await act(async () => finish());
  expect(card.getAttribute('aria-busy')).toBe('false');
});
it('controls and missing edit permission cannot initiate a project move', () => {
  const project = fixtures.projectListItem({ status: 'todo', permissions: { canEdit: false } });
  const { props, card, target } = board({ projects: [project] });
  const dataTransfer = transfer();
  expect(card.draggable).toBe(false);
  fireEvent.dragStart(card, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });
  expect(dataTransfer.getData('application/x-mairie360-project')).toBe('');
  expect(props.onMoveProject).not.toHaveBeenCalled();
});
it('an interactive card control cannot become a drag and a foreign payload cannot move the project', () => {
  const { props, card, target, project } = board();
  const control = within(card).getByRole('button', { name: `Ouvrir la fiche du projet ${project.title}` });
  const dataTransfer = transfer();
  fireEvent.pointerDown(control); fireEvent.dragStart(card, { dataTransfer });
  expect(dataTransfer.getData('application/x-mairie360-project')).toBe('');
  fireEvent.pointerDown(card); fireEvent.dragStart(card, { dataTransfer });
  dataTransfer.setData('application/x-mairie360-project', 'foreign-project');
  fireEvent.dragOver(target, { dataTransfer }); fireEvent.dragLeave(target, { relatedTarget: document.body });
  fireEvent.drop(target, { dataTransfer }); fireEvent.dragEnd(card);
  expect(props.onMoveProject).not.toHaveBeenCalled();
});
it('the add command keeps its selected status and the public status and priority labels stay readable', () => {
  const add = vi.fn(); board({ onAddProject: add });
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter un projet En révision' }));
  expect(add).toHaveBeenCalledWith('review');
  expect(screen.getByRole('region', { name: 'Terminé' })).toBeTruthy();
  expect(priorityConfig.high.label).toBe('Haute');
});
