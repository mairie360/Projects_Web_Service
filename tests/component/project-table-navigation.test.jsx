import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectsPage from '@/app/page';
import { TableView } from '@/components/project/ProjectViews';
import { getProjectDetails, getProjectsPage } from '@/lib/bffProjectClient';
import fixtures from '../support/bff-fixtures.cjs';

vi.mock('@/lib/bffProjectClient', async importOriginal => ({
  ...(await importOriginal()), getProjectDetails: vi.fn(), getProjectsPage: vi.fn(),
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
    await user.tab();
    expect(document.activeElement).toBe(opener);
    expect(opener.getAttribute('aria-haspopup')).toBe('dialog');
    expect(opener.className).toMatch(/focus-visible:outline/);
    await user.keyboard(key);
    expect(props.onProjectOpen).toHaveBeenCalledOnce();
    expect(props.onProjectOpen).toHaveBeenCalledWith(project);
    expect(props.onProjectEdit).not.toHaveBeenCalled();
  });

  it('retains pointer row opening and an independent action menu', async () => {
    const user = userEvent.setup(), project = fixtures.projectListItem(), props = handlers();
    render(<TableView projects={[project]} {...props} />);
    await user.click(screen.getByText(project.description, { exact: true }));
    expect(props.onProjectOpen).toHaveBeenCalledOnce();
    props.onProjectOpen.mockClear();
    await user.click(screen.getByRole('button', { name: `Actions pour ${project.title}`, exact: true }));
    await user.click(screen.getByRole('menuitem', { name: 'Modifier', exact: true }));
    expect(props.onProjectEdit).toHaveBeenCalledOnce();
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

  it.each(['{Enter}', ' '])('uses the existing detail GET and restores the Table opener after %s and Escape', async key => {
    const user = userEvent.setup(), project = fixtures.projectListItem();
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockResolvedValue(fixtures.projectDetails(project));
    render(<ProjectsPage />);
    await user.click(await screen.findByRole('tab', { name: 'Tableau', exact: true }));
    const table = await screen.findByRole('table');
    const opener = within(table).getByRole('button', { name: openerName(project), exact: true });
    opener.focus(); await user.keyboard(key);
    const dialog = await screen.findByRole('dialog', { name: project.title, exact: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(getProjectDetails).toHaveBeenCalledOnce();
    expect(getProjectDetails).toHaveBeenCalledWith(project.id);
    const check = await axe(dialog);
    expect(check.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(getProjectDetails).toHaveBeenCalledOnce();
  });

  it('leaves a refused Table read without fabricating a detail and permits a deliberate keyboard retry', async () => {
    const user = userEvent.setup(), project = fixtures.projectListItem();
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockRejectedValueOnce(new Error('Fiche du tableau indisponible')).mockResolvedValueOnce(fixtures.projectDetails(project));
    render(<ProjectsPage />);
    await user.click(await screen.findByRole('tab', { name: 'Tableau', exact: true }));
    const opener = within(await screen.findByRole('table')).getByRole('button', { name: openerName(project), exact: true });
    opener.focus(); await user.keyboard('{Enter}');
    await screen.findByText('Fiche du tableau indisponible');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(getProjectDetails).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(opener);
    await user.keyboard(' ');
    await screen.findByRole('dialog', { name: project.title, exact: true });
    expect(getProjectDetails).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: 'Fermer la fiche projet', exact: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(opener);
  });
});
