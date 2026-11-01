import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import fixtures from '@tests/support/bff-fixtures.cjs';
import ProjectsPage from '@/app/projects-client';
import { getProjectDetails, getProjectsPage } from '@/lib/bffProjectClient';

vi.mock('@/lib/bffProjectClient', async (importOriginal) => ({
  ...(await importOriginal()),
  getProjectDetails: vi.fn(),
  getProjectsPage: vi.fn(),
}));

describe('ProjectsWorkspace', () => {
  it('renders the workspace with the confirmed projects page', async () => {
    window.history.replaceState({}, '', '/');
    const item = fixtures.projectListItem();
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([item]));
    vi.mocked(getProjectDetails).mockResolvedValue(fixtures.projectDetails(item, []));
    render(<ProjectsPage />);
    expect(await screen.findByRole('button', { name: `Ouvrir la fiche du projet ${item.title}` })).toBeTruthy();
    expect(screen.getByRole('tablist', { name: 'Vue des projets' })).toBeTruthy();
  });
});
