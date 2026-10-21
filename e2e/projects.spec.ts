import { expect, test } from '@playwright/test';
import { cookieHeader, signInAs, users } from './support/session';

// Critical journeys of the Projects front (MAIR-603), on the real stack of docker-compose-e2e.yml:
// a user allowed to manage projects creates, edits and deletes a project and its tasks; a user
// with the "User" role only does not see the action and is refused by the BFF; no session is
// sent back to Login. The texts asserted are the French ones displayed on screen.

const stamp = Date.now().toString(36);
const projectTitle = `Parcours E2E ${stamp}`;
const renamedTitle = `Parcours E2E ${stamp} (modifié)`;
const taskTitle = `Tâche E2E ${stamp}`;

function dueDateInputValue(daysFromNow: number) {
  return new Date(Date.now() + daysFromNow * 24 * 3600 * 1000).toISOString().slice(0, 10);
}

test.describe('project manager', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ context, baseURL }) => {
    await signInAs(context, baseURL!, users.manager);
  });

  test('creates a project from the page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Nouveau projet' }).click();

    const dialog = page.getByRole('dialog', { name: 'Nouveau projet' });
    await expect(dialog).toBeVisible();
    // Required fields are labelled with a star on screen ("Titre*").
    await dialog.getByLabel('Titre*', { exact: true }).fill(projectTitle);
    await dialog.getByLabel('Description*', { exact: true }).fill('Projet créé par le parcours de bout en bout.');
    await dialog.getByLabel('Échéance*', { exact: true }).fill(dueDateInputValue(30));
    // A project needs a main assignee or at least one assignee: the manager picks themselves.
    await dialog.getByLabel('Assigné principal').selectOption({ label: 'Perf Tester' });
    await dialog.getByRole('button', { name: 'Créer le projet' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: `Ouvrir la fiche du projet ${projectTitle}` })).toBeVisible();
  });

  test('adds a task to the project', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: `Ouvrir la fiche du projet ${projectTitle}` }).click();

    const details = page.getByRole('dialog').filter({ hasText: projectTitle });
    await expect(details).toBeVisible();
    const taskForm = details.getByRole('form', { name: 'Créer une tâche' });
    await taskForm.getByLabel('Titre de la tâche').fill(taskTitle);
    // A task needs at least one assignee: the "Assignés" picker lists the seeded users.
    await taskForm.getByRole('button', { name: 'Assignés' }).click();
    await taskForm.getByRole('listbox', { name: 'Assignés' }).getByRole('option', { name: 'Perf Tester' }).click();
    await taskForm.getByRole('button', { name: 'Ajouter la tâche' }).click();
    // The task row offers its completion toggle: the task is listed, not only echoed in the form.
    await expect(details.getByRole('button', { name: `Marquer ${taskTitle} comme terminée` })).toBeVisible();
  });

  test('renames the project', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: `Actions pour ${projectTitle}` }).click();
    await page.getByRole('menuitem', { name: 'Modifier' }).click();

    const dialog = page.getByRole('dialog', { name: 'Modifier le projet' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Titre*', { exact: true }).fill(renamedTitle);
    await dialog.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: `Ouvrir la fiche du projet ${renamedTitle}` })).toBeVisible();
  });

  test('deletes the project and its tasks', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: `Actions pour ${renamedTitle}` }).click();
    await page.getByRole('menuitem', { name: 'Supprimer' }).click();

    const confirm = page.getByRole('dialog', { name: 'Supprimer le projet' });
    await expect(confirm).toContainText('seront supprimés définitivement');
    await confirm.getByRole('button', { name: 'Supprimer' }).click();

    await expect(confirm).toBeHidden();
    await expect(page.getByRole('button', { name: `Ouvrir la fiche du projet ${renamedTitle}` })).toHaveCount(0);
  });
});

test.describe('member with the User role only', () => {
  test('does not see the project creation action', async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, users.member);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Paramètres' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nouveau projet' })).toHaveCount(0);
  });

  test('is refused when creating a project directly', async ({ request }) => {
    const response = await request.post('/projects', {
      headers: { Cookie: cookieHeader(users.member), Accept: 'application/json' },
      data: {
        title: `Refus E2E ${stamp}`,
        description: 'Must be refused by the BFF',
        dueDate: dueDateInputValue(30),
        labels: [],
        priority: 'medium',
        responsibleId: `user-${users.member.id}`,
        assigneeIds: [`user-${users.member.id}`],
        status: 'todo',
      },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(403);
  });
});

test('without a session, the page is not served: the visitor is sent to the session resumption', async ({ request }) => {
  // The middleware never renders the page without a cookie: it redirects to the front's own
  // resumption route, which ends at Login when no session can be resumed.
  const response = await request.get('/', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers()['location']).toContain('/api/auth/resume');
});
