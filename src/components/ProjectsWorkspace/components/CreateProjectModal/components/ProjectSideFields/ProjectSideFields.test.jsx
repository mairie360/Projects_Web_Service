import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, priorityOptions, project, statusOptions } from '@tests/component/units/project-fixtures';
import { createProjectFormState } from '@/lib/projectPageState';
import { ProjectSideFields } from './ProjectSideFields';

describe('ProjectSideFields', () => {
  it('reports the dates and people', () => {
    const onChange = vi.fn();
    render(<ProjectSideFields form={createProjectFormState()} statusOptions={statusOptions} priorityOptions={priorityOptions} responsibleOptions={[{ label: 'Choisir un responsable', value: '' }, ...memberOptions]} memberOptions={memberOptions} labelOptions={[]} onChange={onChange} />);
    fireEvent.change(document.getElementById('project-due-date'), { target: { value: '2026-12-01' } });
    fireEvent.change(document.getElementById('project-responsible'), { target: { value: 'user-3' } });
    expect(onChange.mock.calls.map(([patch]) => patch)).toEqual([{ dueDate: '2026-12-01' }, { responsible: 'user-3' }]);
  });

  it('MAIR-836: lays the fields out in the F3 order, without progress nor task counts', () => {
    render(<ProjectSideFields form={createProjectFormState()} statusOptions={statusOptions} priorityOptions={priorityOptions} responsibleOptions={memberOptions} memberOptions={memberOptions} labelOptions={[]} onChange={vi.fn()} />);
    const ids = [...document.querySelectorAll('select[id], input[id]')].map((field) => field.id).filter((id) => id.startsWith('project-'));
    expect(ids.slice(0, 5)).toEqual(['project-status', 'project-priority', 'project-group', 'project-responsible', 'project-due-date']);
    expect(screen.getByText('Tous les membres du groupe verront le projet. Seuls vos groupes sont proposés.')).toBeTruthy();
    expect(screen.queryByText('Terminées')).toBeNull();
    expect(screen.queryByText('Progression')).toBeNull();
  });

  it('MAIR-836: adds a new label on Entrée without submitting, and refuses markup', () => {
    const onChange = vi.fn();
    const form = { ...createProjectFormState(), labels: ['Voirie'] };
    render(<form onSubmit={() => { throw new Error('submitted'); }}><ProjectSideFields form={form} statusOptions={statusOptions} priorityOptions={priorityOptions} responsibleOptions={memberOptions} memberOptions={memberOptions} labelOptions={[]} onChange={onChange} /></form>);
    const input = screen.getByLabelText('Nouvelle étiquette');
    fireEvent.change(input, { target: { value: '  Sport ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith({ labels: ['Voirie', 'Sport'] });
    expect(input.value).toBe('');
    fireEvent.change(input, { target: { value: '<b>' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Une étiquette ne doit pas contenir les caractères < ou >.')).toBeTruthy();
    // A label typed earlier stays a removable chip although the page does not propose it.
    expect(screen.getAllByText('Voirie').length).toBeGreaterThan(0);
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
