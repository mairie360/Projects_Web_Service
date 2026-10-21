import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, person, priorityOptions, project, statusOptions, task } from '@tests/component/units/project-fixtures';
import { createProjectFormState } from '@/lib/projectPageState';
import { CreateProjectModal } from './CreateProjectModal';

describe('CreateProjectModal', () => {
  it('opens as a dialog and closes from its header', async () => {
    const onClose = vi.fn();
    render(<CreateProjectModal mode="create" form={createProjectFormState()} error="" memberOptions={memberOptions} labelOptions={[]} statusOptions={statusOptions} priorityOptions={priorityOptions} onChange={vi.fn()} onClose={onClose} onSubmit={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Nouveau projet' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Fermer la création de projet' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
