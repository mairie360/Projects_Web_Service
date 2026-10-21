import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import fixtures from '@tests/support/bff-fixtures.cjs';
const handlers = () => ({ onProjectOpen: vi.fn(), onProjectEdit: vi.fn(), onProjectDuplicate: vi.fn(), onProjectDelete: vi.fn(), onProjectTaskAdd: vi.fn() });
import { TableView } from './TableView';

describe('TableView', () => {
  it('lists the projects with their columns', async () => {
    const item = fixtures.projectListItem(); const props = handlers();
    render(<TableView projects={[item]} {...props} />);
    expect(screen.getByRole('columnheader', { name: 'Projet' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: `Ouvrir la fiche du projet ${item.title}` }));
    expect(props.onProjectOpen).toHaveBeenCalledWith(item);
  });
});
