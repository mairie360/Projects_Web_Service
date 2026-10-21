import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, person, priorityOptions, project, statusOptions, task } from '@tests/component/units/project-fixtures';
import { ProjectDetailModal } from './ProjectDetailModal';

const handlers = { onUpdateProject: vi.fn(), onAddTask: vi.fn(), onUpdateTask: vi.fn(), onUpdateTaskStatus: vi.fn(), onDeleteTask: vi.fn(), onCloseProject: vi.fn() };

describe('ProjectDetailModal', () => {
  it('opens the project as a dialog with its tasks and closes', async () => {
    const onClose = vi.fn();
    render(<ProjectDetailModal project={project()} tasks={[task()]} memberOptions={memberOptions} labelOptions={[]} statusOptions={statusOptions} priorityOptions={priorityOptions} onClose={onClose} {...handlers} />);
    expect(screen.getByRole('dialog', { name: 'Rénovation de l’éclairage public' })).toBeTruthy();
    expect(screen.getByText('Relevé des candélabres')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Fermer la fiche projet' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
