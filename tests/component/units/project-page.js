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

/** MAIR-859, MAIR-1137: the task window (lib Modal « Nouvelle tâche » / « Modifier la tâche ») of the project page. */
export const taskSheetElement = () => screen.getByRole('dialog', { name: /^(Nouvelle tâche|Modifier la tâche)$/ });
export const taskSheet = () => within(taskSheetElement());
export const queryTaskSheet = () => screen.queryByRole('dialog', { name: /^(Nouvelle tâche|Modifier la tâche)$/ });

/** Opens the creation sheet from the page header « Nouvelle tâche ». */
export async function openNewTaskSheet(user = userEvent.setup()) {
  await user.click(screen.getByRole('button', { name: 'Nouvelle tâche' }));
  return taskSheet();
}

/** MAIR-1137: opens the page of a task from its card (or list row) title. */
export async function openTaskPage(user, title) {
  await user.click((await screen.findAllByRole('button', { name: `Ouvrir la tâche ${title}` }))[0]);
  return within(await screen.findByRole('article', { name: title }));
}

/** Opens the edit window of a task: its page, then « Modifier » (MAIR-1137: a click never opens the edit). */
export async function openTaskSheet(user, title) {
  const page = await openTaskPage(user, title);
  await user.click(page.getByRole('button', { name: 'Modifier', exact: true }));
  return taskSheet();
}

/** MAIR-1137: moves the creation window to its next step (« Suivant »). */
export async function nextTaskStep(user, sheet = taskSheet()) {
  await user.click(sheet.getByRole('button', { name: 'Suivant' }));
}

/** MAIR-1137: picks the agent of a task among the « Assignée à » cards. */
export async function chooseTaskAssignee(user, name, sheet = taskSheet()) {
  await user.click(within(sheet.getByRole('group', { name: /^Assignée à/ })).getByRole('radio', { name: new RegExp(name) }));
}
