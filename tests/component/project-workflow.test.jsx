import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectWorkflow } from '@/components/ProjectsWorkspace/components/ProjectPage/components/ProjectWorkflow';
import { ProjectTemplatePicker } from '@/components/ProjectsWorkspace/components/CreateProjectModal/components/ProjectTemplatePicker';

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
  it('reads the project statuses for the page without a second task board (MAIR-859)', async () => {
    const onSnapshot = vi.fn();
    render(<ProjectWorkflow projectId="p1" role="User" port={port()} onSnapshot={onSnapshot} />);
    await waitFor(() => expect(onSnapshot).toHaveBeenCalledWith(snapshot()));
    // The tasks are moved on the three-column board of the « Tâches » tab, no longer here.
    expect(screen.queryByRole('region', { name: 'Validation municipale' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Statut de Dossier scolaire' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Paramétrer les statuts' })).toBeNull();
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

  it('ignores a late response from the previous project', async () => {
    const old = deferred();
    const onSnapshot = vi.fn();
    const adapter = port({ readProject: id => id === 'p1' ? old.promise : Promise.resolve({ ...snapshot('p2'), tasks: [{ id: 't2', title: 'Nouveau dossier', statusId: 'queued', canUpdateStatus: false }] }) });
    const view = render(<ProjectWorkflow projectId="p1" role="Admin" port={adapter} onSnapshot={onSnapshot} />);
    view.rerender(<ProjectWorkflow projectId="p2" role="Admin" port={adapter} onSnapshot={onSnapshot} />);
    await waitFor(() => expect(onSnapshot).toHaveBeenCalledTimes(1));
    await act(async () => old.resolve(snapshot('p1')));
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(onSnapshot.mock.calls[0][0].projectId).toBe('p2');
  });
});

describe('project templates', () => {
  it('shows the selected template status preview and passes its verified revision', async () => {
    let selected;
    render(<ProjectTemplatePicker port={port()} onChange={value => { selected = value; }} />);
    // The catalogue is read after mount: choose once its option is in.
    await screen.findByRole('option', { name: 'Dossier municipal' });
    fireEvent.change(screen.getByLabelText('Modèle de projet'), { target: { value: 'model1' } });
    expect(screen.getByRole('list', { name: 'Statuts du modèle' }).textContent).toContain('Validation municipale');
    expect(selected).toEqual(template);
  });
});
