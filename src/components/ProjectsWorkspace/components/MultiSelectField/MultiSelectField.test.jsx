import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, person, priorityOptions, project, statusOptions, task } from '@tests/component/units/project-fixtures';
import { MultiSelectField } from './MultiSelectField';

describe('MultiSelectField', () => {
  it('adds the chosen option to the values', async () => {
    const onChange = vi.fn();
    render(<MultiSelectField id="assignees" label="Assignés" values={[]} options={memberOptions} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('Assignés'));
    await userEvent.click(screen.getByRole('option', { name: 'Alice Martin' }));
    expect(onChange).toHaveBeenCalledWith(['user-2']);
  });
});
