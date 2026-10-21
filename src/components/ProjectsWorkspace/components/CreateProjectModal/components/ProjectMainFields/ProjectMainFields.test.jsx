import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createProjectFormState } from '@/lib/projectPageState';
import { ProjectMainFields } from './ProjectMainFields';

describe('ProjectMainFields', () => {
  it('reports each change', () => {
    const onChange = vi.fn();
    render(<ProjectMainFields form={createProjectFormState()} onChange={onChange} />);
    fireEvent.change(document.getElementById('project-title'), { target: { value: 'Parc' } });
    fireEvent.change(document.getElementById('project-description'), { target: { value: 'Jeux' } });
    expect(onChange.mock.calls.map(([patch]) => patch)).toEqual([{ title: 'Parc' }, { description: 'Jeux' }]);
  });
});
