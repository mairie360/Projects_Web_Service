import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, priorityOptions, statusOptions } from '@tests/component/units/project-fixtures';
import { createProjectFormState } from '@/lib/projectPageState';
import { ProjectRecap } from './ProjectRecap';

describe('ProjectRecap', () => {
  it('MAIR-1136: sums up the three blocks and goes back to their step', async () => {
    const onEditStep = vi.fn();
    const form = { ...createProjectFormState(), title: 'Piscine', groupId: 'group-1', dueDate: '2026-12-01', labels: ['Sport'], assignees: [memberOptions[0].value] };
    render(<ProjectRecap form={form} template={{ id: 't-1', revision: '1', name: 'Marché public', statuses: [] }} memberOptions={memberOptions} groupOptions={[{ value: 'group-1', label: 'Services techniques' }]} statusOptions={statusOptions} priorityOptions={priorityOptions} onEditStep={onEditStep} />);
    const essential = screen.getByRole('region', { name: 'L’essentiel' });
    expect(within(essential).getByText('Piscine')).toBeTruthy();
    expect(within(essential).getByText('Services techniques')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Organisation' })).getByText(memberOptions[0].label)).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Tâches' })).getByText('Marché public')).toBeTruthy();
    expect(screen.getByText('Aucune tâche')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Modifier Organisation' }));
    await userEvent.click(screen.getByRole('button', { name: 'Modifier Tâches' }));
    expect(onEditStep.mock.calls).toEqual([[1], [2]]);
  });
});
