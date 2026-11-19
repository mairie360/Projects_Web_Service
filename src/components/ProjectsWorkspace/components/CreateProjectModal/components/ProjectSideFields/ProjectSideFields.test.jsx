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

  it('MAIR-880: offers the linkable groups, reports the chosen one and shows a group read error', () => {
    const onChange = vi.fn();
    const groupOptions = [{ value: 'group-1', label: 'Services techniques' }, { value: 'group-7', label: 'Urbanisme' }];
    const props = { statusOptions, priorityOptions, responsibleOptions: memberOptions, memberOptions, labelOptions: [], onChange };
    const { rerender } = render(<ProjectSideFields form={createProjectFormState()} groupOptions={groupOptions} {...props} />);
    const group = document.getElementById('project-group');
    expect(group.required).toBe(true);
    expect([...group.options].map((option) => option.textContent)).toEqual(['Choisir un groupe', 'Services techniques', 'Urbanisme']);
    fireEvent.change(group, { target: { value: 'group-7' } });
    fireEvent.change(document.getElementById('project-status'), { target: { value: 'done' } });
    fireEvent.change(document.getElementById('project-priority'), { target: { value: 'high' } });
    expect(onChange.mock.calls.map(([patch]) => patch)).toEqual([{ groupId: 'group-7' }, { status: 'done' }, { priority: 'high' }]);

    rerender(<ProjectSideFields form={createProjectFormState()} groupOptions={[]} groupsError="Groupes indisponibles" groupRequired={false} {...props} />);
    expect(document.getElementById('project-group').required).toBe(false);
    expect(screen.getByText('Groupes indisponibles')).toBeTruthy();
  });
});
