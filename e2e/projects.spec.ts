import { expect, test, type Page } from '@playwright/test';
import { cookieHeader, signInAs, users } from './support/session';

// Critical journeys of the Projects front (MAIR-603), on the real stack of docker-compose-e2e.yml:
// a user allowed to manage projects creates a project, adds a task, edits and deletes that task, closes and reopens the project,
// renames and deletes it; a user
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

  // MAIR-859, MAIR-1137: tasks are cards of the « Tâches » board; « Nouvelle tâche » opens the creation in three steps,
  // a card opens the task page, whose « Modifier » opens the edit window.
  test('adds a task to the project', async ({ page }) => {
    await page.goto('/');
    const details = await openProjectTasks(page, projectTitle);
    await page.getByRole('button', { name: 'Nouvelle tâche', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Nouvelle tâche' });
    await sheet.getByLabel(/^Titre/).fill(taskTitle);
    await sheet.getByRole('button', { name: 'Suivant' }).click();
    // A task needs an assignee: the « Assignée à » cards list the seeded users.
    await sheet.getByRole('group', { name: /^Assignée à/ }).getByRole('radio', { name: /^Perf Tester/ }).check();
    await sheet.getByRole('button', { name: 'Suivant' }).click();
    await sheet.getByRole('button', { name: 'Ajouter la tâche' }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByText(`Tâche « ${taskTitle} » ajoutée à « ${projectTitle} ».`)).toBeVisible();
    await expect(details.getByRole('region', { name: 'À faire' }).getByRole('button', { name: `Ouvrir la tâche ${taskTitle}` })).toBeVisible();
  });

  // MAIR-1178 (ATP F33): search, then status, priority and due-date filters, alone and together; « Réinitialiser les
  // filtres » brings the full list back. The new task is « À faire », due with the project (in 30 days), so never late.
  test('filters the tasks by status and due date, then resets them', async ({ page }) => {
    await page.goto('/');
    const details = await openProjectTasks(page, projectTitle);
    const card = details.getByRole('button', { name: `Ouvrir la tâche ${taskTitle}` });
    const empty = details.getByText('Aucune tâche ne correspond aux filtres');
    const status = details.getByRole('combobox', { name: /Statut/ });
    const due = details.getByRole('combobox', { name: /Échéance/ });
    await expect(card).toBeVisible();
    await expect(details.getByRole('button', { name: 'Réinitialiser les filtres' })).toHaveCount(0);

    await details.getByRole('searchbox', { name: 'Rechercher une tâche' }).fill(taskTitle);
    await status.selectOption({ label: 'À faire' });
    await details.getByRole('combobox', { name: /Priorité/ }).selectOption({ label: 'Moyenne' });
    await expect(card).toBeVisible();

    await due.selectOption({ label: 'En retard' });
    await expect(card).toBeHidden();
    await expect(empty).toBeVisible();
    await due.selectOption({ label: 'Sans échéance' });
    await expect(empty).toBeVisible();
    await due.selectOption({ label: 'Toutes les échéances' });
    await status.selectOption({ label: 'Terminé' });
    await expect(empty).toBeVisible();

    await details.getByRole('radio', { name: 'Liste' }).click();
    await expect(empty).toBeVisible();
    await details.getByRole('button', { name: 'Réinitialiser les filtres' }).last().click();
    await expect(empty).toBeHidden();
    await expect(details.getByRole('searchbox', { name: 'Rechercher une tâche' })).toHaveValue('');
    await expect(details.getByRole('button', { name: 'Réinitialiser les filtres' })).toHaveCount(0);
    await details.getByRole('radio', { name: 'Tableau' }).click();
    await expect(card).toBeVisible();
  });

  // The `#` links of the messaging carry bare ids (`?project=38&task=79`), the Dashboard the public ids.
  test('opens the project and its task from a messaging link, and from a Dashboard link', async ({ page, browser, baseURL }) => {
    await page.goto('/');
    await page.getByRole('button', { name: `Ouvrir la fiche du projet ${projectTitle}` }).click();
    await expect(page.getByRole('heading', { level: 1, name: projectTitle })).toBeVisible();
    const projectId = new URL(page.url()).searchParams.get('project') ?? '';
    expect(projectId).toMatch(/^project-\d+$/);
    const detail = await page.request.get(`/projects/${projectId}`, { headers: { Accept: 'application/json' } });
    expect(detail.status()).toBe(200);
    const taskId: string = (await detail.json()).taskItems.find((task: { title: string }) => task.title === taskTitle).id;
    const bare = (id: string) => id.replace(/^[a-z]+-/, '');

    await page.goto(`/?project=${bare(projectId)}&task=${bare(taskId)}`);
    await expect(page.getByRole('heading', { level: 1, name: projectTitle })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Tâches/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator(`[data-linked-task="${taskId}"]`)).toHaveAttribute('aria-current', 'true');
    await expect(page.getByText('Lien de projet invalide.')).toHaveCount(0);

    await page.goto(`/?project=${projectId}`);
    await expect(page.getByRole('heading', { level: 1, name: projectTitle })).toBeVisible();

    // A colleague who is not a member of the project is refused: no project page opens.
    const outsider = await browser.newContext();
    await signInAs(outsider, baseURL!, users.member);
    const outsiderPage = await outsider.newPage();
    const refusal = outsiderPage.waitForResponse((response) => new URL(response.url()).pathname === `/projects/${projectId}`);
    await outsiderPage.goto(`/?project=${bare(projectId)}&task=${bare(taskId)}`);
    expect([403, 404]).toContain((await refusal).status());
    await expect(outsiderPage.getByRole('button', { name: 'Paramètres' })).toBeVisible();
    await expect(outsiderPage.getByRole('heading', { level: 1, name: projectTitle })).toHaveCount(0);
    await outsider.close();
  });

  test('edits the task', async ({ page }) => {
    await page.goto('/');
    const details = await openProjectTasks(page, projectTitle);
    await details.getByRole('button', { name: `Ouvrir la tâche ${taskTitle}` }).click();
    const taskPage = page.getByRole('article', { name: taskTitle });
    await expect(taskPage).toBeVisible();
    await taskPage.getByRole('button', { name: 'Modifier', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Modifier la tâche' });
    await expect(sheet.getByLabel(/^Titre/)).toHaveValue(taskTitle);
    await sheet.getByLabel(/^Titre/).fill(editedTaskTitle);
    await sheet.getByRole('button', { name: 'Enregistrer (1)' }).click();

    await expect(sheet).toBeHidden();
    await expect(page.getByRole('heading', { level: 2, name: editedTaskTitle })).toBeVisible();
    await page.getByRole('button', { name: `Retour aux tâches de ${projectTitle}` }).click();
    await expect(details.getByRole('button', { name: `Ouvrir la tâche ${editedTaskTitle}` })).toBeVisible();
    await expect(details.getByRole('button', { name: `Ouvrir la tâche ${taskTitle}`, exact: true })).toHaveCount(0);
  });

  test('deletes the task', async ({ page }) => {
    await page.goto('/');
    const details = await openProjectTasks(page, projectTitle);
    await details.getByRole('button', { name: `Ouvrir la tâche ${editedTaskTitle}` }).click();
    await page.getByRole('article', { name: editedTaskTitle }).getByRole('button', { name: `Actions pour ${editedTaskTitle}` }).click();
    await page.getByRole('menuitem', { name: 'Supprimer la tâche' }).click();
    await expect(page.getByText('Supprimer définitivement cette tâche ?', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Supprimer', exact: true }).click();

    await expect(details.getByRole('button', { name: `Ouvrir la tâche ${editedTaskTitle}` })).toHaveCount(0);
    // Gone from the server too: the page URL reloads the project page itself (MAIR-846), on its « Tâches » tab.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: projectTitle })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Tâches/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: `Ouvrir la tâche ${editedTaskTitle}` })).toHaveCount(0);
  });

  // MAIR-1200: a closed project is read-only until its manager reopens it; the rename below then proves edits are back.
  test('closes the project, reads it read-only, then reopens it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: `Ouvrir la fiche du projet ${projectTitle}` }).click();
    await expect(page.getByRole('heading', { level: 1, name: projectTitle })).toBeVisible();
    await page.getByRole('button', { name: 'Clôturer', exact: true }).click();

    const banner = page.getByRole('status').filter({ hasText: 'Projet clôturé — lecture seule.' });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Rouvrez le projet pour le modifier.');
    await expect(page.getByRole('button', { name: 'Modifier', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Nouvelle tâche', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: /^Plus d’actions/ }).click();
    await expect(page.getByRole('menuitem', { name: 'Modifier' })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'Dupliquer' })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Rouvrir', exact: true }).click();
    const reopen = page.getByRole('menu', { name: 'Rouvrir le projet en' });
    await expect(reopen.getByRole('menuitem')).toHaveText(['À faire', 'En cours', 'En revue', 'Suspendu']);
    await reopen.getByRole('menuitem', { name: 'En cours' }).click();

    await expect(page.getByText('Projet rouvert')).toBeVisible();
    await expect(banner).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Modifier', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rouvrir', exact: true })).toHaveCount(0);
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
