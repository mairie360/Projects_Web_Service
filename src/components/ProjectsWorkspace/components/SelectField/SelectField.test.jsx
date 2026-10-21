import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, person, priorityOptions, project, statusOptions, task } from '@tests/component/units/project-fixtures';
import { SelectField } from './SelectField';

describe('SelectField', () => {
  it('reports the chosen option', () => {
    const onChange = vi.fn();
    render(<SelectField id="project-status" label="Statut" value="todo" options={statusOptions} onChange={onChange} />);
    fireEvent.change(document.getElementById('project-status'), { target: { value: 'done' } });
    expect(onChange).toHaveBeenCalledWith('done');
  });
});
