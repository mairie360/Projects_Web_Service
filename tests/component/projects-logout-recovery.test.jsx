import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import ProjectsPage from '@/app/page';
import { getProjectsPage } from '@/lib/bffProjectClient';
import { logoutAndReload } from '@/lib/auth-session';
import { returnToLogin } from '@/lib/auth-token';
import fixtures from '../support/bff-fixtures.cjs';

vi.mock('@/lib/bffProjectClient', async original => ({ ...(await original()), getProjectsPage: vi.fn() }));
vi.mock('@/lib/auth-session', async original => ({ ...(await original()), logoutAndReload: vi.fn() }));
vi.mock('@/lib/auth-token', async original => ({ ...(await original()), returnToLogin: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, '', '/');
  vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([]));
});

it('retains the workspace after refused logout and returns only on the explicit recovery choice', async () => {
  const user = userEvent.setup();
  vi.mocked(logoutAndReload).mockRejectedValue(new Error('La déconnexion n’a pas été confirmée.'));
  render(<ProjectsPage />);
  await screen.findByRole('heading', { name: 'Projets', exact: true });
  await user.click(await within(screen.getByRole('banner')).findByRole('button', { name: /Administrateur|Responsable|Agent|Maire/ }));
  await user.click(screen.getByText('Déconnexion', { exact: true }));
  const recovery = await screen.findByRole('button', { name: 'Retour à la connexion', exact: true });
  expect(screen.getByRole('heading', { name: 'Projets', exact: true })).toBeTruthy();
  expect(screen.getByText('La déconnexion n’a pas été confirmée.')).toBeTruthy();
  expect(logoutAndReload).toHaveBeenCalledOnce();
  expect(returnToLogin).not.toHaveBeenCalled();
  await user.click(recovery);
  expect(returnToLogin).toHaveBeenCalledOnce();
});
