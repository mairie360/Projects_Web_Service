import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import fixtures from '@tests/support/bff-fixtures.cjs';
import { statusConfig } from '@/types/project';
import { KanbanBoard } from './KanbanBoard';

const columns = Object.entries(statusConfig).map(([status, presentation]) => ({ status, label: presentation.label }));

describe('KanbanBoard', () => {
  it('lays the projects out in one region per status', () => {
    const item = fixtures.projectListItem({ status: 'todo' });
    render(<KanbanBoard projects={[item]} columns={columns} onMoveProject={vi.fn().mockResolvedValue(undefined)} onProjectOpen={vi.fn()} />);
    expect(screen.getByRole('group', { name: item.title })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'En cours' })).toBeTruthy();
  });
});
