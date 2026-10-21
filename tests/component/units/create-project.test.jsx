import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CreateProjectFeedback } from '@/components/project/create-project/CreateProjectFeedback';
import { CreateProjectFooter, submitLabel } from '@/components/project/create-project/CreateProjectFooter';
import { ProjectMainFields } from '@/components/project/create-project/ProjectMainFields';
import { ProjectSideFields } from '@/components/project/create-project/ProjectSideFields';
import { createProjectFormState } from '@/lib/projectPageState';
import { memberOptions, priorityOptions, statusOptions } from './project-fixtures';

const feedback = { feedbackId: 'f', feedbackRef: React.createRef(), pending: false, verificationRequired: false, verificationMessage: 'À vérifier', verificationPending: false, verificationLabel: 'Vérifier le projet', verificationPendingLabel: 'Vérification…', onVerify: vi.fn() };

describe('MAIR-608 create project sub-components', () => {
  it('CreateProjectFeedback shows one state at a time', async () => {
    const onVerify = vi.fn();
    const { rerender } = render(<CreateProjectFeedback {...feedback} pending />);
    expect(screen.getByRole('status').textContent).toContain('Enregistrement en cours…');
    rerender(<CreateProjectFeedback {...feedback} verificationRequired verificationError="Lecture refusée" error="ignoré" onVerify={onVerify} />);
    expect(screen.getByRole('alert').textContent).toContain('À vérifierLecture refusée');
    await userEvent.click(screen.getByRole('button', { name: 'Vérifier le projet' }));
    expect(onVerify).toHaveBeenCalledTimes(1);
    rerender(<CreateProjectFeedback {...feedback} confirmedCreationTitle="Projet A" />);
    expect(screen.getByRole('status').textContent).toContain('Création vérifiée : Projet A');
    rerender(<CreateProjectFeedback {...feedback} error="Création refusée" />);
    expect(screen.getByRole('alert').textContent).toContain('Création refusée');
  });

  it('ProjectMainFields and ProjectSideFields report each change', () => {
    const onChange = vi.fn();
    const form = { ...createProjectFormState(), completedTasks: 1, totalTasks: 4, progress: 25 };
    render(<>
      <ProjectMainFields form={form} onChange={onChange} />
      <ProjectSideFields form={form} statusOptions={statusOptions} priorityOptions={priorityOptions} responsibleOptions={[{ label: 'Sélectionner un assigné', value: '' }, ...memberOptions]}
        memberOptions={memberOptions} labelOptions={[]} onChange={onChange} />
    </>);
    fireEvent.change(document.getElementById('project-title'), { target: { value: 'Parc' } });
    fireEvent.change(document.getElementById('project-description'), { target: { value: 'Jeux' } });
    fireEvent.change(document.getElementById('project-due-date'), { target: { value: '2026-12-01' } });
    fireEvent.change(document.getElementById('project-responsible'), { target: { value: 'user-3' } });
    expect(onChange.mock.calls.map(([patch]) => patch)).toEqual([{ title: 'Parc' }, { description: 'Jeux' }, { dueDate: '2026-12-01' }, { responsible: 'user-3' }]);
    expect(screen.getByText('Terminées').nextSibling.textContent).toContain('1');
    expect(screen.getByText('Total').nextSibling.textContent).toContain('4');
  });

  it('CreateProjectFooter labels the submit for each state and closes', async () => {
    const onClose = vi.fn();
    const { rerender } = render(<CreateProjectFooter editing={false} pending={false} creationConfirmed={false} submitBlocked={false} onClose={onClose} />);
    expect(screen.getByRole('button', { name: 'Créer le projet' }).disabled).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<CreateProjectFooter editing={false} pending={false} creationConfirmed submitBlocked onClose={onClose} />);
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Création vérifiée' }).disabled).toBe(true);
    expect([submitLabel({ editing: true, pending: false, creationConfirmed: false }), submitLabel({ editing: true, pending: true, creationConfirmed: false })])
      .toEqual(['Enregistrer', 'Enregistrement en cours…']);
  });
});
