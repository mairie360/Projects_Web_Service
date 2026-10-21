import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, person, priorityOptions, project, statusOptions, task } from '@tests/component/units/project-fixtures';
import { CompactMultiSelect } from './CompactMultiSelect';

describe('CompactMultiSelect', () => {
  it('opens the listbox and toggles a value', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<CompactMultiSelect label="Assignés" values={[]} options={memberOptions} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Assignés' }));
    await userEvent.click(screen.getByRole('option', { name: 'Alice Martin' }));
    expect(onChange).toHaveBeenCalledWith(['user-2']);
    rerender(<CompactMultiSelect label="Assignés" values={['user-2']} options={memberOptions} onChange={onChange} />);
    expect(screen.getByRole('button', { name: /1 sélectionné/ })).toBeTruthy();
    await userEvent.click(screen.getByRole('option', { name: 'Alice Martin' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});
