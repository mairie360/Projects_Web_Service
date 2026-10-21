import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import fixtures from '@tests/support/bff-fixtures.cjs';
import { ProjectCard } from './ProjectCard';

describe('ProjectCard', () => {
  it('opens the project from its title in both variants', async () => {
    const item = fixtures.projectListItem(); const onOpen = vi.fn();
    const { rerender } = render(<ProjectCard project={item} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: `Ouvrir la fiche du projet ${item.title}` }));
    rerender(<ProjectCard variant="grid" project={item} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: `Ouvrir la fiche du projet ${item.title}` }));
    expect(onOpen).toHaveBeenCalledTimes(2);
  });
});
