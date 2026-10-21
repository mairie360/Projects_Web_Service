import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import fixtures from '@tests/support/bff-fixtures.cjs';
const handlers = () => ({ onProjectOpen: vi.fn(), onProjectEdit: vi.fn(), onProjectDuplicate: vi.fn(), onProjectDelete: vi.fn(), onProjectTaskAdd: vi.fn() });
import { GridView } from './GridView';

describe('GridView', () => {
  it('renders one card per project and the empty state otherwise', async () => {
    const item = fixtures.projectListItem(); const props = handlers();
    const { rerender } = render(<GridView projects={[item]} memberOptions={[]} labelOptions={[]} {...props} />);
    await userEvent.click(screen.getByRole('button', { name: `Ouvrir la fiche du projet ${item.title}` }));
    expect(props.onProjectOpen).toHaveBeenCalledWith(item);
    rerender(<GridView projects={[]} memberOptions={[]} labelOptions={[]} {...props} />);
    expect(screen.getByText('Aucun projet à afficher')).toBeTruthy();
  });
});
