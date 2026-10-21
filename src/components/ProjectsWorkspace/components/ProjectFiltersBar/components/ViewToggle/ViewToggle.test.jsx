import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ViewToggle } from './ViewToggle';

describe('ViewToggle', () => {
  it('selects the current view and reports another', async () => {
    const onChange = vi.fn();
    render(<ViewToggle value="kanban" options={[{ value: 'kanban', label: 'Kanban' }, { value: 'table', label: 'Tableau' }]} onChange={onChange} />);
    expect(screen.getByRole('tab', { name: /Kanban/ }).getAttribute('aria-selected')).toBe('true');
    await userEvent.click(screen.getByRole('tab', { name: /Tableau/ }));
    expect(onChange).toHaveBeenCalledWith('table');
  });
});
