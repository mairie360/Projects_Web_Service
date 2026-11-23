import { expect, test, type Page } from '@playwright/test';
import { cookieHeader, signInAs, users } from './support/session';

// Critical journeys of the Projects front (MAIR-603), on the real stack of docker-compose-e2e.yml:
// a user allowed to manage projects creates a project, adds a task, edits and deletes that task, renames and deletes the project; a user
// with the "User" role only does not see the action and is refused by the BFF; no session is
// sent back to Login. The texts asserted are the French ones displayed on screen.

const stamp = Date.now().toString(36);
const projectTitle = `Parcours E2E ${stamp}`;
const renamedTitle = `Parcours E2E ${stamp} (modifié)`;
const taskTitle = `Tâche E2E ${stamp}`;
const editedTaskTitle = `Tâche E2E ${stamp} (modifiée)`;

function dueDateInputValue(daysFromNow: number) {
  return new Date(Date.now() + daysFromNow * 24 * 3600 * 1000).toISOString().slice(0, 10);
}

// MAIR-846: a project opens as a page (`?project=<id>`) on « Vue d’ensemble »; its tasks are in the « Tâches » tab.
async function openProjectTasks(page: Page, title: string) {
  await page.getByRole('button', { name: `Ouvrir la fiche du projet ${title}` }).click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await page.getByRole('tab', { name: /^Tâches/ }).click();
  return page.getByRole('tabpanel');
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
    // MAIR-836: the description is optional in the V2 dialog.
    await dialog.getByLabel('Description', { exact: true }).fill('Projet créé par le parcours de bout en bout.');
    await dialog.getByLabel('Échéance*', { exact: true }).fill(dueDateInputValue(30));
    // MAIR-1136: the creation goes step by step; « Suivant » moves to « Organisation ».
    await dialog.getByRole('button', { name: 'Suivant', exact: true }).click();
    await expect(dialog.getByText('Étape 2 sur 4 · Organisation')).toBeVisible();
    // A project needs a responsible or at least one team member: the manager picks themselves (« Responsable », MAIR-836).
    await dialog.getByLabel('Responsable').selectOption({ label: 'Perf Tester' });
    await dialog.getByRole('button', { name: 'Passer au récapitulatif' }).click();
    await expect(dialog.getByRole('region', { name: 'L’essentiel' })).toContainText(projectTitle);
    await dialog.getByRole('button', { name: 'Créer le projet' }).click();

    await expect(dialog).toBeHidden();
    // MAIR-836: the « Projet créé » toast names the project and its card shows in the list.
    await expect(page.getByText(`Projet « ${projectTitle} » créé.`)).toBeVisible();
    await expect(page.getByRole('button', { name: `Ouvrir la fiche du projet ${projectTitle}` })).toBeVisible();
  });

  // MAIR-859: tasks are cards of the « Tâches » board; « Nouvelle tâche » and a card open the task sheet (a Drawer).
  test('adds a task to the project', async ({ page }) => {
    await page.goto('/');
    const details = await openProjectTasks(page, projectTitle);
    await page.getByRole('button', { name: 'Nouvelle tâche', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Nouvelle tâche' });
    await sheet.getByLabel(/^Titre/).fill(taskTitle);
    // A task needs at least one assignee: the « Assignée à » picker lists the seeded users.
    await sheet.getByRole('button', { name: 'Assignée à' }).click();
    await sheet.getByRole('listbox', { name: 'Assignée à' }).getByRole('option', { name: 'Perf Tester' }).click();
    await sheet.getByRole('button', { name: 'Ajouter la tâche' }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByText(`Tâche « ${taskTitle} » ajoutée à « ${projectTitle} ».`)).toBeVisible();
    await expect(details.getByRole('region', { name: 'À faire' }).getByRole('button', { name: `Ouvrir la tâche ${taskTitle}` })).toBeVisible();
  });

  test('edits the task', async ({ page }) => {
    await page.goto('/');
    const details = await openProjectTasks(page, projectTitle);
    await details.getByRole('button', { name: `Ouvrir la tâche ${taskTitle}` }).click();
    const sheet = page.getByRole('dialog', { name: 'Modifier la tâche' });
    await expect(sheet.getByLabel(/^Titre/)).toHaveValue(taskTitle);
    await sheet.getByLabel(/^Titre/).fill(editedTaskTitle);
    await sheet.getByRole('button', { name: 'Enregistrer la tâche' }).click();

    await expect(sheet).toBeHidden();
    await expect(details.getByRole('button', { name: `Ouvrir la tâche ${editedTaskTitle}` })).toBeVisible();
    await expect(details.getByRole('button', { name: `Ouvrir la tâche ${taskTitle}`, exact: true })).toHaveCount(0);
  });

  test('deletes the task', async ({ page }) => {
    await page.goto('/');
    const details = await openProjectTasks(page, projectTitle);
    await details.getByRole('button', { name: `Ouvrir la tâche ${editedTaskTitle}` }).click();
    await page.getByRole('dialog', { name: 'Modifier la tâche' }).getByRole('button', { name: 'Supprimer la tâche' }).click();
    await expect(page.getByText('Supprimer définitivement cette tâche ?', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Supprimer', exact: true }).click();

    await expect(details.getByRole('button', { name: `Ouvrir la tâche ${editedTaskTitle}` })).toHaveCount(0);
    // Gone from the server too: the page URL reloads the project page itself (MAIR-846), on its « Tâches » tab.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: projectTitle })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Tâches/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: `Ouvrir la tâche ${editedTaskTitle}` })).toHaveCount(0);
  });

  test('renames the project', async ({ page }) => {
    await page.goto('/');
    // MAIR-846: the project page header « Modifier » opens the project fields in a modal.
    await page.getByRole('button', { name: `Ouvrir la fiche du projet ${projectTitle}` }).click();
    await expect(page.getByRole('heading', { level: 1, name: projectTitle })).toBeVisible();
    await page.getByRole('button', { name: 'Modifier', exact: true }).click();

    const form = page.getByRole('dialog', { name: /^Modifier le projet/ }).getByRole('form', { name: 'Modifier le projet' });
    await expect(form).toBeVisible();
    await form.getByLabel('Titre*', { exact: true }).fill(renamedTitle);
    // MAIR-1136: the button counts the changed fields.
    await form.getByRole('button', { name: /^Enregistrer \(\d+\)$/ }).click();

    await expect(form).toBeHidden();
    await expect(page.getByText('Modifications enregistrées')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: renamedTitle })).toBeVisible();
    await page.getByRole('navigation', { name: 'Fil d’Ariane' }).getByRole('button', { name: 'Projets' }).click();
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
