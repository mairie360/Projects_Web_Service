import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ProjectDetailModal } from '@/components/project/ProjectDetailModal';
import { CreateProjectModal } from '@/components/project/CreateProjectModal';
import { TaskComposer } from '@/components/project-card/TaskComposer';
import { projectToFormState } from '@/lib/projectPageState';
import fixtures from '../support/bff-fixtures.cjs';
const statuses = [
  { id: 'status-1', name: 'Demande reçue', color: '#1256a6', category: 'todo' },
  { id: 'status-2', name: 'Conseil municipal', color: '#4b908d', category: 'inprogress' },
  { id: 'status-3', name: 'Dossier archivé', color: '#267845', category: 'done' },
];
const template = { id: 'template-1', name: 'Instruction municipale', revision: 'r1', statuses };
const port = { readProject: async projectId => ({ projectId, statuses, tasks: [], revision: 'v1' }), readTemplates: async () => [template], createProjectFromTemplate: async () => fixtures.projectDetails() };
const page = fixtures.projectsPage();
const project = fixtures.projectListItem();
// The sheet shows its statuses once the project detail (with its tasks) is loaded (MAIR-567).
const props = { project: { ...project, taskItems: [] }, tasks: [], memberOptions: page.options.members, defaultTaskAssigneeId: 'user-3', labelOptions: [], statusOptions: page.filters.statuses, priorityOptions: page.filters.priorities, onClose() {}, onUpdateProject() {}, onAddTask() {}, onUpdateTask() {}, onUpdateTaskStatus() {}, onDeleteTask: async () => undefined, onCloseProject: async () => undefined };

describe('workflow adoption by existing project forms', () => {
  it('submits a custom project task status ID with its category from the detailed task form', async () => {
    function Detail() {
      const [saved, setSaved] = React.useState();
      return <><ProjectDetailModal {...props} workflowPort={port} workflowRole="User" onAddTask={(_project, draft) => setSaved(draft)} /><output data-testid="saved">{JSON.stringify(saved)}</output></>;
    }
    render(<Detail />);
    await screen.findByRole('region', { name: 'Conseil municipal' });
    const form = screen.getByRole('form', { name: 'Créer une tâche' });
    fireEvent.change(within(form).getByLabelText('Titre de la tâche'), { target: { value: 'Plan communal' } });
    fireEvent.change(within(form).getByLabelText('Statut', { exact: true }), { target: { value: 'status-2' } });
    fireEvent.submit(form);
    const saved = JSON.parse((await screen.findByTestId('saved')).textContent);
    expect(saved.title).toBe('Plan communal');
    expect(saved.statusId).toBe('status-2');
    expect(saved.status).toBe('in-progress');
  });

  it('uses project statuses in the card composer and keeps the rejected draft', async () => {
    const user = userEvent.setup();
    render(<TaskComposer project={project} workflowPort={port} memberOptions={page.options.members} onAddTask={async () => { throw new Error('Création refusée'); }} />);
    await user.click(screen.getByRole('button', { name: 'Ajouter une tâche' }));
    await screen.findByRole('option', { name: 'Conseil municipal' });
    fireEvent.change(screen.getByLabelText('Titre de la tâche'), { target: { value: 'Brouillon communal' } });
    fireEvent.change(screen.getByLabelText('Statut', { exact: true }), { target: { value: 'status-2' } });
    await user.click(screen.getByRole('button', { name: 'Ajouter', exact: true }));
    await screen.findByText('Création refusée');
    expect(screen.getByLabelText('Titre de la tâche').value).toBe('Brouillon communal');
    expect(screen.getByLabelText('Statut', { exact: true }).value).toBe('status-2');
  });

  it('carries the selected template from the project creation form to the submit boundary', async () => {
    function Creation() {
      const [selection, setSelection] = React.useState();
      return <><CreateProjectModal mode="create" workflowPort={port} form={projectToFormState(project)} error="" memberOptions={page.options.members} labelOptions={[]} statusOptions={page.filters.statuses} priorityOptions={page.filters.priorities} onChange={() => undefined} onClose={() => undefined} onSubmit={(event, selected) => { event.preventDefault(); setSelection(selected); }} /><output data-testid="selection">{JSON.stringify(selection)}</output></>;
    }
    render(<Creation />);
    await screen.findByRole('option', { name: 'Instruction municipale' });
    fireEvent.change(screen.getByLabelText('Modèle de projet'), { target: { value: 'template-1' } });
    fireEvent.submit(screen.getByRole('dialog'));
    expect(JSON.parse(screen.getByTestId('selection').textContent)).toEqual(template);
    expect(screen.getByRole('list', { name: 'Statuts du modèle' }).textContent).toContain('Conseil municipal');
  });
});
