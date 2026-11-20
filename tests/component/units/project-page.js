import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/** MAIR-846: the project page is the `<section>` of the visible level-1 title (the list is hidden meanwhile). */
export const projectPageElement = async () => (await screen.findByRole('heading', { level: 1 })).closest('section');
export const projectPage = () => within(screen.getByRole('heading', { level: 1 }).closest('section'));
export const findProjectPage = async () => within(await projectPageElement());

/** Opens the « Tâches » tab of the project page (its tasks stay mounted, but hidden, on the other tabs). */
export async function openTasksTab(user = userEvent.setup()) {
  await user.click(await screen.findByRole('tab', { name: /^Tâches/ }));
  return projectPage();
}

/** Leaves the project page through its breadcrumb « ← Projets ». */
export async function backToProjects(user = userEvent.setup()) {
  await user.click(projectPage().getByRole('button', { name: 'Projets' }));
}

/** Synchronous form of `projectPageElement`, for direct renders of `ProjectPage`. */
export const pageSection = () => screen.getByRole('heading', { level: 1 }).closest('section');

/** The visible tab panel of the project page (« Tâches » for the task tests). */
export const visibleTabPanel = () => screen.getByRole('tabpanel');
