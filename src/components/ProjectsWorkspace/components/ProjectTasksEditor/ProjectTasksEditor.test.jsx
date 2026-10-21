import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, person, priorityOptions, project, statusOptions, task } from '@tests/component/units/project-fixtures';
import { createProjectFormState } from '@/lib/projectPageState';
import { ProjectTasksEditor } from './ProjectTasksEditor';

describe('ProjectTasksEditor', () => {
  it('adds a draft task to the project form with Enter', async () => {
    const onChange = vi.fn();
    render(<ProjectTasksEditor form={{ ...createProjectFormState(), responsible: 'user-3' }} memberOptions={memberOptions} labelOptions={[]} statusOptions={statusOptions} priorityOptions={priorityOptions} onChange={onChange} />);
    expect(screen.getByText('Aucune tâche pour ce projet.')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Nouvelle tâche'), 'Relevé{Enter}');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].taskItems.map(item => item.title)).toEqual(['Relevé']);
  });
});
