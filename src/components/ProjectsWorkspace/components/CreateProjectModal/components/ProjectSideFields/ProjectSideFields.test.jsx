import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, priorityOptions, project, statusOptions } from '@tests/component/units/project-fixtures';
import { createProjectFormState } from '@/lib/projectPageState';
import { ProjectSideFields } from './ProjectSideFields';

describe('ProjectSideFields', () => {
  it('reports the dates and people, and sums the tasks', () => {
    const onChange = vi.fn();
    const form = { ...createProjectFormState(), completedTasks: 1, totalTasks: 4, progress: 25 };
    render(<ProjectSideFields form={form} statusOptions={statusOptions} priorityOptions={priorityOptions} responsibleOptions={[{ label: 'Sélectionner un assigné', value: '' }, ...memberOptions]} memberOptions={memberOptions} labelOptions={[]} onChange={onChange} />);
    fireEvent.change(document.getElementById('project-due-date'), { target: { value: '2026-12-01' } });
    fireEvent.change(document.getElementById('project-responsible'), { target: { value: 'user-3' } });
    expect(onChange.mock.calls.map(([patch]) => patch)).toEqual([{ dueDate: '2026-12-01' }, { responsible: 'user-3' }]);
    expect(screen.getByText('Terminées').nextSibling.textContent).toContain('1');
    expect(screen.getByText('Total').nextSibling.textContent).toContain('4');
  });
});
