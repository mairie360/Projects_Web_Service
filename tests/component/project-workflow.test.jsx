import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProjectWorkflow, ProjectTemplateManager, ProjectTemplatePicker } from '@/components/project/ProjectWorkflow';

const statuses = [
  { id: 'queued', name: 'À instruire', color: '#1256a6', category: 'todo' },
  { id: 'validation', name: 'Validation municipale', color: '#4b908d', category: 'inprogress' },
  { id: 'archived', name: 'Archivé', color: '#267845', category: 'done' },
];
const snapshot = (projectId = 'p1') => ({ projectId, revision: 'v1', statuses, tasks: [{ id: 't1', title: 'Dossier scolaire', statusId: 'validation', canUpdateStatus: true }] });
const template = { id: 'model1', name: 'Dossier municipal', revision: 'r1', statuses };
const port = (overrides = {}) => ({ readProject: async id => snapshot(id), readTemplates: async () => [template], ...overrides });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

describe('project task workflow', () => {
  it('renders project columns and keyboard status selection from the real snapshot', async () => {
    render(<ProjectWorkflow projectId="p1" role="User" port={port()} />);
    const column = await screen.findByRole('region', { name: 'Validation municipale' });
    expect(within(column).getByText('Dossier scolaire')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Archivé' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Paramétrer les statuts' })).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Statut de Dossier scolaire' }).disabled).toBe(true);
  });

  it('keeps legacy operation unavailable without inventing persistence', () => {
    render(<ProjectWorkflow projectId="p1" role="Admin" />);
    expect(screen.getByText(/configuration des statuts et des modèles est indisponible/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Enregistrer les statuts' })).toBeNull();
  });

  it('preserves the status draft on rejected writes and requires migration before deleting a used status', async () => {
    render(<ProjectWorkflow projectId="p1" role="Responsable" port={port({ readProject: async () => ({ ...snapshot(), statuses: [...statuses, { id: 'review', name: 'Relecture', color: '#1256a6', category: 'inprogress' }] }), saveProjectStatuses: async () => { throw new Error('Connexion interrompue'); } })} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Paramétrer les statuts' }));
    fireEvent.change(screen.getByLabelText('Nom du statut 1'), { target: { value: 'À examiner' } });
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer Validation municipale' }));
    expect(screen.getByRole('button', { name: 'Confirmer la suppression' }).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Déplacer les tâches vers'), { target: { value: 'queued' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les statuts' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Connexion interrompue/);
    expect(screen.getByLabelText('Nom du statut 1').value).toBe('À examiner');
    expect(screen.getByRole('button', { name: 'Enregistrer les statuts' }).disabled).toBe(true);
    expect(screen.queryByText('Statuts enregistrés.')).toBeNull();
  });

  it('rejects a write receipt for another project and never shows saved success', async () => {
    render(<ProjectWorkflow projectId="p1" role="Admin" port={port({ moveTask: async () => snapshot('p2') })} />);
    fireEvent.change(await screen.findByRole('combobox', { name: 'Statut de Dossier scolaire' }), { target: { value: 'queued' } });
    expect((await screen.findByRole('alert')).textContent).toMatch(/vérifi/i);
    expect(screen.getByRole('region', { name: 'Validation municipale' }).textContent).toContain('Dossier scolaire');
  });

  it('ignores a late response from the previous project', async () => {
    const old = deferred();
    const adapter = port({ readProject: id => id === 'p1' ? old.promise : Promise.resolve({ ...snapshot('p2'), tasks: [{ id: 't2', title: 'Nouveau dossier', statusId: 'queued', canUpdateStatus: false }] }) });
    const view = render(<ProjectWorkflow projectId="p1" role="Admin" port={adapter} />);
    view.rerender(<ProjectWorkflow projectId="p2" role="Admin" port={adapter} />);
    await screen.findByText('Nouveau dossier');
    await act(async () => old.resolve(snapshot('p1')));
    expect(screen.queryByText('Dossier scolaire')).toBeNull();
    expect(screen.getByText('Nouveau dossier')).toBeTruthy();
  });

  it('accepts a status update only after matching task and revision are confirmed', async () => {
    render(<ProjectWorkflow projectId="p1" role="User" port={port({ moveTask: async () => ({ ...snapshot(), revision: 'v2', tasks: [{ ...snapshot().tasks[0], statusId: 'queued' }] }) })} />);
    fireEvent.change(await screen.findByRole('combobox', { name: 'Statut de Dossier scolaire' }), { target: { value: 'queued' } });
    await screen.findByText('Modification vérifiée.');
    expect(within(screen.getByRole('region', { name: 'À instruire' })).getByText('Dossier scolaire')).toBeTruthy();
  });
});

describe('project templates', () => {
  it('shows the selected template status preview and passes its verified revision', async () => {
    let selected;
    render(<ProjectTemplatePicker port={port()} onChange={value => { selected = value; }} />);
    fireEvent.change(await screen.findByLabelText('Modèle de projet'), { target: { value: 'model1' } });
    expect(screen.getByRole('list', { name: 'Statuts du modèle' }).textContent).toContain('Validation municipale');
    expect(selected).toEqual(template);
  });

  it('hides management for every role except responsible and admin', () => {
    const view = render(<ProjectTemplateManager role="User" port={port()} />);
    expect(screen.queryByRole('button')).toBeNull();
    view.rerender(<ProjectTemplateManager role="Maire" port={port()} />);
    expect(screen.queryByRole('button')).toBeNull();
    view.rerender(<ProjectTemplateManager role="Responsable" />);
    expect(screen.getByRole('button', { name: 'Gérer les modèles' }).disabled).toBe(true);
  });

  it('preserves a template draft when its receipt does not confirm the edited name', async () => {
    render(<ProjectTemplateManager role="Admin" port={port({ saveTemplate: async () => ({ ...template, revision: 'r2' }) })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gérer les modèles' }));
    fireEvent.change(await screen.findByLabelText('Modèle à modifier'), { target: { value: 'model1' } });
    fireEvent.change(screen.getByLabelText('Nom du modèle'), { target: { value: 'Modèle actualisé' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le modèle' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/vérifi/i);
    expect(screen.getByLabelText('Nom du modèle').value).toBe('Modèle actualisé');
    expect(screen.queryByText('Modèle enregistré.')).toBeNull();
  });
});
