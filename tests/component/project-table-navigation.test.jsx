import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectsPage from '@/app/projects-client';
import { TableView } from '@/components/ProjectsWorkspace/components/TableView';
import { getProjectDetails, getProjectsPage } from '@/lib/bffProjectClient';
import fixtures from '../support/bff-fixtures.cjs';

vi.mock('@/lib/bffProjectClient', async importOriginal => ({
  ...(await importOriginal()), getProjectDetails: vi.fn(), getProjectsPage: vi.fn(), getProjectGroups: vi.fn(async () => [{ id: 'group-1', name: 'Services techniques' }]), getProjectActivity: vi.fn(async () => ({ items: [], pagination: { page: 1, limit: 5, total: 0, hasNextPage: false } })),
}));

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  vi.mocked(getProjectsPage).mockReset();
  vi.mocked(getProjectDetails).mockReset();
});

const handlers = () => ({ onProjectOpen: vi.fn(), onProjectEdit: vi.fn(), onProjectDuplicate: vi.fn(), onProjectDelete: vi.fn() });
const openerName = project => `Ouvrir la fiche du projet ${project.title}`;

describe('Project Table detail entry', () => {
  it.each(['{Enter}', ' '])('opens exactly once with %s without bubbling into the row', async key => {
    const user = userEvent.setup(), project = fixtures.projectListItem(), props = handlers();
    render(<TableView projects={[project]} {...props} />);
    const opener = screen.getByRole('button', { name: openerName(project), exact: true });
    // MAIR-833: the sortable « Clé » header now comes first in the tab order; the title stays the row's keyboard entry.
    await user.tab();
    expect(document.activeElement.textContent).toMatch(/^Clé/);
    opener.focus();
    expect(document.activeElement).toBe(opener);
    expect(opener.getAttribute('aria-haspopup')).toBeNull(); // MAIR-846: it opens a page, not a dialog
    expect(opener.className).toMatch(/focus-visible:outline/);
    await user.keyboard(key);
    expect(props.onProjectOpen).toHaveBeenCalledOnce();
    expect(props.onProjectOpen).toHaveBeenCalledWith(project);
    expect(props.onProjectDuplicate).not.toHaveBeenCalled();
  });

  it('retains pointer row opening and an independent action menu', async () => {
    const user = userEvent.setup(), project = fixtures.projectListItem(), props = handlers();
    render(<TableView projects={[project]} {...props} />);
    await user.click(screen.getByText(project.description, { exact: true }));
    expect(props.onProjectOpen).toHaveBeenCalledOnce();
    props.onProjectOpen.mockClear();
    await user.click(screen.getByRole('button', { name: `Actions pour ${project.title}`, exact: true }));
    // MAIR-829: the menu duplicates without opening the row.
    await user.click(screen.getByRole('menuitem', { name: 'Dupliquer', exact: true }));
    expect(props.onProjectDuplicate).toHaveBeenCalledOnce();
    expect(props.onProjectOpen).not.toHaveBeenCalled();
  });

  it('keeps a denied view permission disabled for both keyboard and row pointer entry', async () => {
    const user = userEvent.setup(), project = fixtures.projectListItem();
    project.permissions = { ...project.permissions, canView: false };
    const props = handlers(); render(<TableView projects={[project]} {...props} />);
    const opener = screen.getByRole('button', { name: openerName(project), exact: true });
    expect(opener.disabled).toBe(true);
    await user.click(opener);
    await user.click(screen.getByText(project.description, { exact: true }));
    expect(props.onProjectOpen).not.toHaveBeenCalled();
  });

  // MAIR-846: the row opens the project page (URL `?project=<id>`); « ← Projets » brings back the Table and its opener.
  it.each(['{Enter}', ' '])('uses the existing detail GET to open the project page with %s and restores the Table opener', async key => {
    const user = userEvent.setup(), project = fixtures.projectListItem();
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockResolvedValue(fixtures.projectDetails(project));
    window.history.replaceState({}, '', '/?view=table');
    render(<ProjectsPage />);
    const table = await screen.findByRole('table');
    const opener = within(table).getByRole('button', { name: openerName(project), exact: true });
    opener.focus(); await user.keyboard(key);
    const title = await screen.findByRole('heading', { level: 1, name: project.title });
    const page = title.closest('section');
    expect(document.activeElement).toBe(title);
    expect(window.location.search).toBe(`?view=table&project=${project.id}`);
    expect(screen.queryByRole('table')).toBeNull();
    expect(getProjectDetails).toHaveBeenCalledOnce();
    expect(getProjectDetails).toHaveBeenCalledWith(project.id);
    const check = await axe(page);
    expect(check.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
    await user.click(within(page).getByRole('button', { name: 'Projets' }));
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: project.title })).toBeNull());
    expect(window.location.search).toBe('?view=table');
    expect(screen.getByRole('table')).toBeTruthy();
    expect(document.activeElement).toBe(opener);
    expect(getProjectDetails).toHaveBeenCalledOnce();
  });

  it('leaves a refused Table read without fabricating a page and permits a deliberate keyboard retry', async () => {
    const user = userEvent.setup(), project = fixtures.projectListItem();
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockRejectedValueOnce(new Error('Fiche du tableau indisponible')).mockResolvedValueOnce(fixtures.projectDetails(project));
    window.history.replaceState({}, '', '/?view=table');
    render(<ProjectsPage />);
    const opener = within(await screen.findByRole('table')).getByRole('button', { name: openerName(project), exact: true });
    opener.focus(); await user.keyboard('{Enter}');
    await screen.findByText('Fiche du tableau indisponible');
    expect(screen.queryByRole('heading', { level: 1, name: project.title })).toBeNull();
    expect(getProjectDetails).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(opener);
    await user.keyboard(' ');
    const title = await screen.findByRole('heading', { level: 1, name: project.title });
    expect(getProjectDetails).toHaveBeenCalledTimes(2);
    await user.click(within(title.closest('section')).getByRole('button', { name: 'Projets', exact: true }));
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: project.title })).toBeNull());
    expect(document.activeElement).toBe(opener);
  });
});
