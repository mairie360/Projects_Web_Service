import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectsPage from "@/app/projects-client";
import { closeProject, createProjectTask, deleteProjectTask, duplicateProject, getProjectDetails, getProjectsPage, updateProject, updateProjectTask, updateProjectTaskStatus } from "@/lib/bffProjectClient";
import { checkedOptions, toggleOption } from './units/multi-select';
import fixtures from "../support/bff-fixtures.cjs";

// MAIR-846: a project opens as a page on « Vue d’ensemble »; the task journeys continue in its « Tâches » tab,
// and « ← Projets » brings the list back (the page is no dialog any more: no Escape, no close button).
async function tasksTab(user) {
  await user.click(await screen.findByRole('tab', { name: /^Tâches/ }));
  return within(screen.getByRole('tabpanel'));
}
// MAIR-859: tasks are cards of the board; a card is the <article> of its title, its sheet is a Drawer.
const taskCard = (title) => screen.getByRole('heading', { name: title }).closest('article');
const sheet = () => within(screen.getByRole('dialog', { name: /^(Nouvelle tâche|Modifier la tâche)$/ }));
const sheetTitle = () => sheet().getByRole('textbox', { name: /^Titre/ });
async function openTaskCard(user, title) {
  await user.click(within(taskCard(title)).getByRole('button', { name: `Ouvrir la tâche ${title}` }));
  return sheet();
}
async function moveTaskTo(user, title, column) {
  await user.click(within(taskCard(title)).getByRole('button', { name: `Actions pour ${title}` }));
  await user.click(await screen.findByRole('menuitemradio', { name: column }));
}
const projectHeading = (name) => screen.queryByRole('heading', { level: 1, ...(name ? { name } : {}) });
async function leaveProject(user) {
  await user.click(within(projectHeading().closest('section')).getByRole('button', { name: 'Projets', exact: true }));
  await waitFor(() => expect(screen.queryByRole('tablist', { name: 'Sections du projet' })).toBeNull());
}

vi.mock("@/lib/bffProjectClient", async (importOriginal) => ({
  ...(await importOriginal()),
  // MAIR-880: the creation form reads the linkable groups once.
  getProjectGroups: vi.fn(async () => [{ id: 'group-1', name: 'Services techniques' }]),
  getProjectDetails: vi.fn(),
  getProjectsPage: vi.fn(),
  duplicateProject: vi.fn(),
  createProjectTask: vi.fn(),
  deleteProjectTask: vi.fn(),
  updateProjectTaskStatus: vi.fn(),
  updateProjectTask: vi.fn(),
  closeProject: vi.fn(),
  updateProject: vi.fn(),
}));

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  vi.mocked(getProjectsPage).mockReset().mockResolvedValue(fixtures.projectsPage([]));
  vi.mocked(getProjectDetails).mockReset().mockResolvedValue(fixtures.projectDetails());
  vi.mocked(duplicateProject).mockReset();
  vi.mocked(createProjectTask).mockReset();
  vi.mocked(deleteProjectTask).mockReset();
  vi.mocked(updateProjectTaskStatus).mockReset();
  vi.mocked(updateProjectTask).mockReset();
  vi.mocked(closeProject).mockReset();
  vi.mocked(updateProject).mockReset();
});

describe("Projects page", () => {
  it('retains a colliding task-create draft, reads without replay and restores its latest fields after closing the detail', async () => {
    const user = userEvent.setup(), project = fixtures.projectListItem(), task = fixtures.projectTask();
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockResolvedValue(fixtures.projectDetails(project, [task]));
    vi.mocked(createProjectTask).mockResolvedValue({ ...task, title: 'Reçu collision interdit' });
    render(<ProjectsPage />);
    const opener = await screen.findByRole('button', { name: `Ouvrir la fiche du projet ${project.title}` });
    await user.click(opener);
    await tasksTab(user);
    await user.click(screen.getByRole('button', { name: 'Nouvelle tâche' }));
    const dialog = sheet(), input = sheetTitle();
    await user.type(input, 'Brouillon collision conservé');
    await toggleOption(user, dialog, 'Assignée à', 'Marie Durand'); await user.click(input);
    await user.selectOptions(dialog.getByLabelText('Priorité', { exact: true }), 'low');
    fireEvent.change(dialog.getByLabelText('Échéance', { exact: true }), { target: { value: '2026-11-17' } });
    await user.click(dialog.getByRole('button', { name: 'Ajouter la tâche', exact: true }));
    await dialog.findByText('Création de tâche non vérifiée : Brouillon collision conservé');
    expect(input.value).toBe('Brouillon collision conservé');
    expect(dialog.getByRole('button', { name: 'Ajouter la tâche', exact: true }).disabled).toBe(true);
    expect(document.activeElement.textContent).toMatch(/Création de tâche non vérifiée/);
    expect(screen.getByRole('heading', { name: task.title })).toBeTruthy();
    expect(screen.queryByText('Reçu collision interdit')).toBeNull();
    await user.type(input, ' — dernière saisie');
    fireEvent.submit(input.closest('form'));
    const inspect = dialog.getByRole('button', { name: 'Inspecter les tâches du projet', exact: true });
    vi.mocked(getProjectDetails).mockRejectedValueOnce(new Error('Inspection503'));
    inspect.focus(); await user.keyboard('{Enter}');
    await dialog.findByText('Inspection503');
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails(project, [task]));
    inspect.focus(); await user.keyboard('{Enter}');
    await dialog.findByText(/Données du projet relues/);
    expect(input.value).toBe('Brouillon collision conservé — dernière saisie');
    expect(createProjectTask).toHaveBeenCalledOnce();
    expect(getProjectDetails).toHaveBeenCalledTimes(3);
    await user.click(dialog.getByRole('button', { name: 'Annuler', exact: true }));
    await leaveProject(user);
    await user.click(opener);
    await tasksTab(user);
    await user.click(screen.getByRole('button', { name: 'Nouvelle tâche' }));
    expect(sheetTitle().value).toBe('Brouillon collision conservé — dernière saisie');
    expect(sheet().getByLabelText('Priorité', { exact: true }).value).toBe('low');
    expect(sheet().getByLabelText('Échéance', { exact: true }).value).toBe('2026-11-17');
    await user.click(sheet().getByRole('button', { name: 'Annuler', exact: true }));
    const edit = await openTaskCard(user, task.title);
    expect(edit.getByRole('button', { name: 'Enregistrer la tâche', exact: true }).disabled).toBe(false);
    await user.click(edit.getByRole('button', { name: 'Annuler', exact: true }));
    await user.click(screen.getByRole('button', { name: 'Nouvelle tâche' }));
    expect(sheetTitle().value).toBe('Brouillon collision conservé — dernière saisie');
    expect(createProjectTask).toHaveBeenCalledOnce();
  });
  it('verifies only a distinct malformed copy by keyboard GET and re-enables its source without a replay', async () => {
    const user = userEvent.setup(), first = fixtures.projectListItem();
    const created = fixtures.projectListItem({ id: 'new-distinct-id', title: 'Copie canonique vérifiée' });
    const task = fixtures.projectTask();
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([first]));
    vi.mocked(duplicateProject).mockResolvedValue(fixtures.projectDetails(created, [task, { ...task }]));
    vi.mocked(getProjectDetails).mockRejectedValueOnce(new Error('Fiche indisponible')).mockResolvedValue(fixtures.projectDetails(created, [task]));
    render(<ProjectsPage />);
    const opener = await screen.findByRole('button', { name: `Actions pour ${first.title}` });
    await user.click(opener);
    await user.click(screen.getByRole('menuitem', { name: 'Dupliquer', exact: true }));
    const verify = await screen.findByRole('button', { name: 'Vérifier le projet', exact: true });
    verify.focus(); await user.keyboard('{Enter}');
    await screen.findByText('Fiche indisponible');
    expect(duplicateProject).toHaveBeenCalledOnce();
    verify.focus(); await user.keyboard('{Enter}');
    await screen.findByRole('button', { name: `Ouvrir la fiche du projet ${created.title}` });
    expect(screen.queryByText(`Duplication non vérifiée : ${first.title}`)).toBeNull();
    expect(getProjectDetails).toHaveBeenCalledTimes(2);
    expect(getProjectDetails).toHaveBeenCalledWith(created.id);
    expect(getProjectsPage).toHaveBeenCalledOnce();
    await user.click(opener);
    expect(screen.getByRole('menuitem', { name: 'Dupliquer', exact: true }).disabled).toBe(false);
    expect(duplicateProject).toHaveBeenCalledOnce();
  });

  it('keeps a collided duplication visible with GET-only recovery and no second duplicate POST', async () => {
    const user = userEvent.setup(), first = fixtures.projectListItem();
    const second = fixtures.projectListItem({ id: 'project-2', title: 'Carte existante intacte' });
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([first, second]));
    vi.mocked(duplicateProject).mockResolvedValue(fixtures.projectDetails({ ...second, title: 'Collision interdite' }));
    render(<ProjectsPage />);
    const opener = await screen.findByRole('button', { name: `Actions pour ${first.title}` });
    await user.click(opener);
    await user.click(screen.getByRole('menuitem', { name: 'Dupliquer', exact: true }));
    await screen.findByText(`Duplication non vérifiée : ${first.title}`);
    expect(screen.queryByText('Collision interdite')).toBeNull();
    expect(screen.getByRole('button', { name: `Ouvrir la fiche du projet ${second.title}` })).toBeTruthy();
    expect(getProjectsPage).toHaveBeenCalledOnce();
    await user.click(opener);
    const blocked = screen.getByRole('menuitem', { name: 'Copie à vérifier', exact: true });
    expect(blocked.disabled).toBe(true);
    await user.click(blocked);
    expect(duplicateProject).toHaveBeenCalledOnce();
    await user.keyboard('{Escape}');
    const retry = screen.getByRole('button', { name: 'Actualiser le catalogue', exact: true });
    retry.focus(); await user.keyboard('{Enter}');
    await waitFor(() => expect(retry.disabled).toBe(false));
    expect(getProjectsPage).toHaveBeenCalledTimes(2);
    expect(screen.getByText(`Duplication non vérifiée : ${first.title}`)).toBeTruthy();
    await user.click(opener);
    expect(screen.getByRole('menuitem', { name: 'Copie à vérifier', exact: true }).disabled).toBe(true);
    expect(duplicateProject).toHaveBeenCalledOnce();
  });


  it('retains inline project fields and consumes a newly denied edit permission after verification',async()=>{
    const user=userEvent.setup(),project=fixtures.projectListItem({dueDate:'2026-12-15'});
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails(project,[]));
    vi.mocked(updateProject).mockResolvedValueOnce(fixtures.projectDetails({...project,id:'project-2'},[]));
    render(<ProjectsPage/>);
    await user.click(await screen.findByRole('button',{name:`Ouvrir la fiche du projet ${project.title}`}));
    await screen.findByRole('heading',{level:1,name:project.title});const detail=screen;
    await user.click(detail.getByRole('button',{name:'Modifier',exact:true}));
    const form=within(detail.getByRole('form',{name:'Modifier le projet'})),title=form.getByLabelText(/^Titre/);
    await user.clear(title);await user.type(title,'Brouillon inline retenu');
    await user.click(form.getByRole('button',{name:'Enregistrer',exact:true}));
    await waitFor(()=>expect(form.getByRole('button',{name:'Enregistrer',exact:true}).disabled).toBe(true));
    expect(title.value).toBe('Brouillon inline retenu');
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails({...project,permissions:{...project.permissions,canEdit:false,canClose:false}},[]));
    const retry=detail.getByRole('button',{name:'Réessayer la fiche',exact:true});retry.focus();await user.keyboard('{Enter}');
    await waitFor(()=>expect(detail.queryByRole('button',{name:'Réessayer la fiche',exact:true})).toBeNull());
    expect(title.value).toBe('Brouillon inline retenu');expect(form.queryByRole('alert')).toBeNull();
    expect(form.getByRole('button',{name:'Enregistrer',exact:true}).disabled).toBe(true);
    expect(detail.queryByRole('button',{name:'Clôturer',exact:true})).toBeNull();expect(updateProject).toHaveBeenCalledOnce();
  });

  it('keeps persistent project recovery after closing the detail and does not duplicate its GET',async()=>{
    const user=userEvent.setup(),project=fixtures.projectListItem({dueDate:'2026-12-15'}),other=fixtures.projectListItem({id:'project-2',title:'Autre carte intacte',dueDate:'2026-12-15'});
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project,other]));
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails(project,[]));
    vi.mocked(closeProject).mockResolvedValueOnce(fixtures.projectDetails({...other,title:'Titre étranger ne pas afficher'},[]));
    render(<ProjectsPage/>);
    await user.click(await screen.findByRole('button',{name:`Ouvrir la fiche du projet ${project.title}`}));
    await screen.findByRole('heading',{level:1,name:project.title});const detail=screen;await user.click(detail.getByRole('button',{name:'Clôturer',exact:true}));
    await waitFor(()=>expect(detail.getByRole('button',{name:'Clôturer',exact:true}).disabled).toBe(true));
    await leaveProject(user);
    const read=Promise.withResolvers();vi.mocked(getProjectDetails).mockImplementationOnce(()=>read.promise);
    const verify=screen.getByRole('button',{name:`Vérifier le projet ${project.title}`,exact:true});
    verify.focus();await user.keyboard('{Enter}');await user.click(verify);
    expect(verify.disabled).toBe(true);expect(getProjectDetails).toHaveBeenCalledTimes(2);
    await act(async()=>read.resolve(fixtures.projectDetails({...project,title:'Projet vérifié sans répéter'},[])));
    await waitFor(()=>expect(screen.queryByRole('button',{name:`Vérifier le projet ${project.title}`,exact:true})).toBeNull());
    expect(screen.getByRole('button',{name:`Ouvrir la fiche du projet ${other.title}`})).toBeTruthy();
    expect(screen.queryByText('Titre étranger ne pas afficher')).toBeNull();expect(closeProject).toHaveBeenCalledOnce();
  });




  it.each([false, true])("keeps a newer task and its draft after a late project close (detail read succeeds: %s)", async successfulRead => {
    const user = userEvent.setup();
    const project = fixtures.projectListItem();
    const task = fixtures.projectTask();
    const other = fixtures.projectTask({ id: 'task-2', title: 'Autre tâche officielle' });
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails(project, [task, other]));
    const write = Promise.withResolvers();
    vi.mocked(closeProject).mockImplementationOnce(() => write.promise);
    render(<ProjectsPage />);
    await user.click(await screen.findByRole('button', { name: `Ouvrir la fiche du projet ${project.title}` }));
    await user.click(screen.getByRole('button', { name: 'Suspendre', exact: true }));
    await tasksTab(user);
    expect(closeProject).toHaveBeenCalledTimes(1);
    const confirmed = fixtures.projectTask({ title: 'Tâche confirmée récemment', status: 'done' });
    const verified = { ...confirmed, title: 'Tâche enrichie par lecture' };
    vi.mocked(updateProjectTaskStatus).mockResolvedValueOnce(confirmed);
    vi.mocked(getProjectsPage).mockRejectedValue(new Error('Liste temporairement refusée'));
    if (successfulRead) vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails(project, [verified, other]));
    else vi.mocked(getProjectDetails).mockRejectedValueOnce(new Error('Détail temporairement refusé'));
    await moveTaskTo(user, task.title, 'Terminé');
    const expected = successfulRead ? verified.title : confirmed.title;
    expect(await screen.findByRole('heading', { name: expected })).toBeTruthy();
    const draft = await openTaskCard(user, other.title);
    const title = draft.getByRole('textbox', { name: /^Titre/ });
    await user.clear(title); await user.type(title, 'Brouillon à conserver');
    await act(async () => write.resolve(fixtures.projectDetails({ ...project, title: 'Projet confirmé tardivement', status: 'review', progress: 17, tasks: { total: 9, completed: 2, active: 9, archived: 0 } }, [task, other])));
    expect(await screen.findByRole('heading', { level: 1, name: 'Projet confirmé tardivement' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: expected })).toBeTruthy();
    expect(screen.getByRole('heading', { name: other.title })).toBeTruthy();
    expect(title.value).toBe('Brouillon à conserver');
    expect(screen.getByText(/tâches terminées$/).textContent).toBe('2/9 tâches terminées'); // MAIR-846: « Avancement » metric
    expect(screen.getByRole('button', { name: 'Réessayer la fiche' }).disabled).toBe(false);
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails({ ...project, title: 'Projet confirmé tardivement', tasks: { total: 2, completed: 1, active: 2, archived: 0 }, progress: 50 }, [verified, other]));
    screen.getByRole('button', { name: 'Réessayer la fiche' }).focus(); await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Réessayer la fiche' })).toBeNull());
    expect(screen.getByRole('heading', { name: verified.title })).toBeTruthy();
    expect(title.value).toBe('Brouillon à conserver');
    expect(screen.getByText(/tâches terminées$/).textContent).toBe('1/2 tâches terminées'); // MAIR-846: « Avancement » metric
    expect(closeProject).toHaveBeenCalledTimes(1);
    expect(updateProjectTaskStatus).toHaveBeenCalledTimes(1);
    await leaveProject(user);
  });

  it("retains a submitted edit after an accepted mismatched receipt and permits only GET recovery", async () => {
    const user = userEvent.setup();
    const project = fixtures.projectListItem();
    const task = fixtures.projectTask();
    const other = fixtures.projectTask({ id: 'task-2', title: 'Autre tâche officielle' });
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails(project, [task, other]));
    vi.mocked(updateProjectTask).mockResolvedValueOnce({ ...other, title: 'Mauvaise confirmation éditée' });
    render(<ProjectsPage />);
    await user.click(await screen.findByRole('button', { name: `Ouvrir la fiche du projet ${project.title}` }));
    await tasksTab(user);
    const row = taskCard(task.title);
    await openTaskCard(user, task.title);
    const title = sheetTitle();
    await user.clear(title); await user.type(title, 'Modification envoyée');
    vi.mocked(getProjectDetails).mockRejectedValueOnce(new Error('Vérification indisponible'));
    await user.click(screen.getByRole('button', { name: 'Enregistrer la tâche' }));
    expect(await within(row).findByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Mauvaise confirmation éditée' })).toBeNull();
    expect(title.value).toBe('Modification envoyée');
    expect(screen.getByRole('button', { name: 'Enregistrer la tâche' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Réessayer la fiche' }).disabled).toBe(false);
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails(project, [fixtures.projectTask({ title: 'Valeur vérifiée' }), other]));
    screen.getByRole('button', { name: 'Réessayer la fiche' }).focus(); await user.keyboard('{Enter}');
    expect(await screen.findByRole('heading', { name: 'Valeur vérifiée' })).toBeTruthy();
    expect(title.value).toBe('Modification envoyée');
    expect(screen.getByRole('button', { name: 'Enregistrer la tâche' }).disabled).toBe(false);
    expect(updateProjectTask).toHaveBeenCalledTimes(1);
    expect(within(screen.getByRole('form', { name: 'Modifier une tâche' })).queryByRole('alert')).toBeNull();
    await user.clear(title);
    await user.click(screen.getByRole('button', { name: 'Enregistrer la tâche' }));
    // MAIR-859 (C5): the title rule is shown under the field.
    expect(within(screen.getByRole('form', { name: 'Modifier une tâche' })).getByRole('alert').textContent).toBe('Donnez un titre à la tâche');
    expect(updateProjectTask).toHaveBeenCalledTimes(1);
  });

  it("protects an uncertain task receipt and retains its draft until keyboard GET verification", async () => {
    const user = userEvent.setup();
    const project = fixtures.projectListItem();
    const task = fixtures.projectTask();
    const other = fixtures.projectTask({ id: 'task-2', title: 'Autre tâche officielle' });
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails(project, [task, other]));
    vi.mocked(updateProjectTaskStatus).mockResolvedValueOnce({ ...other, title: 'Mauvaise confirmation reçue' });
    render(<ProjectsPage />);
    await user.click(await screen.findByRole('button', { name: `Ouvrir la fiche du projet ${project.title}` }));
    await tasksTab(user);
    vi.mocked(getProjectDetails).mockRejectedValueOnce(new Error('Vérification indisponible'));
    await moveTaskTo(user, task.title, 'Terminé');
    // The card is back in its column (a new element): the write is not confirmed.
    const rowAlert = await waitFor(() => within(taskCard(task.title)).getByRole('alert'));
    const row = taskCard(task.title);
    expect(row.closest('[data-task-column]').getAttribute('data-task-column')).toBe('todo');
    expect(rowAlert.textContent).toContain('acceptée');
    expect(rowAlert.textContent).toContain('confirmation de tâche est incohérente');
    expect(screen.queryByRole('heading', { name: 'Mauvaise confirmation reçue' })).toBeNull();
    expect(screen.getByRole('heading', { name: other.title })).toBeTruthy();
    // The task waits for a verification read: no move, no deletion, no save from its sheet.
    await user.click(within(row).getByRole('button', { name: `Actions pour ${task.title}` }));
    expect(screen.queryByRole('menuitemradio')).toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Supprimer la tâche' }).disabled).toBe(true);
    await user.keyboard('{Escape}');
    await user.click(within(taskCard(other.title)).getByRole('button', { name: `Actions pour ${other.title}` }));
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(3);
    await user.keyboard('{Escape}');
    await openTaskCard(user, task.title);
    const title = sheetTitle();
    await user.clear(title); await user.type(title, 'Brouillon à garder');
    expect(screen.getByRole('button', { name: 'Enregistrer la tâche' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Réessayer la fiche' }).disabled).toBe(false);
    const verified = fixtures.projectTask({ title: 'Titre vérifié par lecture' });
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails(project, [verified, other]));
    screen.getByRole('button', { name: 'Réessayer la fiche' }).focus(); await user.keyboard('{Enter}');
    expect(await screen.findByRole('heading', { name: verified.title })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Enregistrer la tâche' }).disabled).toBe(false);
    expect(sheetTitle().value).toBe('Brouillon à garder');
    expect(updateProjectTaskStatus).toHaveBeenCalledTimes(1);
  });

  it("shows a scoped pending status guard, moves the card while the write runs and rolls it back on refusal (MAIR-859 C2)", async () => {
    const user = userEvent.setup();
    const project = fixtures.projectListItem();
    const task = fixtures.projectTask();
    const other = fixtures.projectTask({ id: 'task-2', title: 'Autre tâche reçue' });
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockResolvedValue(fixtures.projectDetails(project, [task, other]));
    const write = Promise.withResolvers();
    vi.mocked(updateProjectTaskStatus).mockImplementationOnce(() => write.promise);
    render(<ProjectsPage />);
    await user.click(await screen.findByRole('button', { name: `Ouvrir la fiche du projet ${project.title}` }));
    await tasksTab(user);
    const column = (title) => taskCard(title).closest('[data-task-column]').getAttribute('data-task-column');
    expect(column(task.title)).toBe('todo');
    await moveTaskTo(user, task.title, 'Terminé');
    expect(updateProjectTaskStatus).toHaveBeenCalledTimes(1);
    // The card waits in its new column, busy, with no other move offered.
    expect(column(task.title)).toBe('done');
    expect(taskCard(task.title).getAttribute('aria-busy')).toBe('true');
    expect(within(taskCard(task.title)).getByRole('status').textContent).toBe('Enregistrement…');
    await user.click(within(taskCard(task.title)).getByRole('button', { name: `Actions pour ${task.title}` }));
    expect(screen.queryByRole('menuitemradio')).toBeNull();
    await user.keyboard('{Escape}');
    await user.click(within(taskCard(other.title)).getByRole('button', { name: `Actions pour ${other.title}` }));
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(3);
    await user.keyboard('{Escape}');
    await act(async () => write.reject(new Error('Écriture refusée')));
    // Rolled back to « À faire », with the refusal on the card and in an error toast.
    await waitFor(() => expect(column(task.title)).toBe('todo'));
    expect(within(taskCard(task.title)).getByRole('alert').textContent).toContain('Écriture refusée');
    expect(await screen.findByText('Statut non modifié')).toBeTruthy();
    expect(taskCard(task.title).getAttribute('aria-busy')).toBeNull();
    const confirmed = fixtures.projectTask({ title: 'Statut canonique reçu', status: 'done', completed: true });
    vi.mocked(updateProjectTaskStatus).mockResolvedValueOnce(confirmed);
    vi.mocked(getProjectDetails).mockRejectedValueOnce(new Error('Relecture refusée'));
    await moveTaskTo(user, task.title, 'Terminé');
    expect(await screen.findByRole('heading', { name: confirmed.title })).toBeTruthy();
    expect(column(confirmed.title)).toBe('done');
    expect(screen.getByRole('button', { name: 'Réessayer la fiche' }).disabled).toBe(false);
    expect(updateProjectTaskStatus).toHaveBeenCalledTimes(2);
  });

  it("guards a pending delete, retains other cards and retries only the refused read", async () => {
    const user = userEvent.setup();
    const project = fixtures.projectListItem();
    const task = fixtures.projectTask();
    const other = fixtures.projectTask({ id: 'task-2', title: 'Autre tâche reçue' });
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails(project, [task, other]));
    const write = Promise.withResolvers();
    vi.mocked(deleteProjectTask).mockImplementationOnce(() => write.promise);
    render(<ProjectsPage />);
    await user.click(await screen.findByRole('button', { name: `Ouvrir la fiche du projet ${project.title}` }));
    await tasksTab(user);
    await user.click(within(taskCard(task.title)).getByRole('button', { name: `Actions pour ${task.title}` }));
    await user.click(screen.getByRole('menuitem', { name: 'Supprimer la tâche' }));
    expect(screen.getByText('Supprimer définitivement cette tâche ?')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Supprimer', exact: true }));
    expect(taskCard(task.title).getAttribute('aria-busy')).toBe('true');
    await user.click(within(taskCard(task.title)).getByRole('button', { name: `Actions pour ${task.title}` }));
    expect(screen.getByRole('menuitem', { name: 'Supprimer la tâche' }).disabled).toBe(true);
    await user.keyboard('{Escape}');
    expect(deleteProjectTask).toHaveBeenCalledTimes(1);
    vi.mocked(getProjectDetails).mockRejectedValueOnce(new Error('Relecture refusée'));
    await act(async () => write.resolve());
    expect(await screen.findByRole('button', { name: 'Réessayer la fiche' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: task.title })).toBeNull();
    expect(screen.getByRole('heading', { name: other.title })).toBeTruthy();
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails({ ...project, tasks: { total: 1, completed: 0, active: 1, archived: 0 } }, [other]));
    screen.getByRole('button', { name: 'Réessayer la fiche' }).focus(); await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Réessayer la fiche' })).toBeNull());
    expect(deleteProjectTask).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/tâches terminées$/).textContent).toBe('0/1 tâches terminées'); // MAIR-846: « Avancement » metric
  });

  it("keeps a canonical created task on detail failure and retries GET only by keyboard", async () => {
    const user = userEvent.setup();
    const project = fixtures.projectListItem();
    const confirmed = fixtures.projectTask({ id: 'task-confirmed', title: 'Tâche canonique reçue' });
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    let finishRecovery;
    vi.mocked(getProjectDetails)
      .mockResolvedValueOnce(fixtures.projectDetails(project))
      .mockRejectedValueOnce(new Error('Détail temporairement refusé'))
      .mockImplementationOnce(() => new Promise(resolve => { finishRecovery = resolve; }));
    vi.mocked(createProjectTask).mockResolvedValueOnce(confirmed);
    render(<ProjectsPage />);
    await user.click(await screen.findByRole('button', { name: `Ouvrir la fiche du projet ${project.title}` }));
    await tasksTab(user);
    await user.click(screen.getByRole('button', { name: 'Nouvelle tâche' }));
    await user.type(sheetTitle(), 'Brouillon soumis');
    await toggleOption(user, sheet(), 'Assignée à', 'Marie Durand'); await user.click(sheetTitle());
    await user.click(screen.getByRole('button', { name: 'Ajouter la tâche', exact: true }));
    expect(await screen.findByRole('heading', { name: confirmed.title, level: 4 })).toBeTruthy();
    expect(screen.getByText('Les tâches confirmées restent affichées. Les compteurs et la progression restent ceux de la dernière réponse projet reçue.')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Nouvelle tâche' })).toBeNull();
    expect(screen.getByText(/tâches terminées$/).textContent).toBe('1/2 tâches terminées'); // MAIR-846: « Avancement » metric
    const retry = screen.getByRole('button', { name: 'Réessayer la fiche' });
    retry.focus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(getProjectDetails).toHaveBeenCalledTimes(3));
    expect(retry.disabled).toBe(true);
    expect(retry.getAttribute('aria-busy')).toBe('true');
    await user.dblClick(retry);
    expect(getProjectDetails).toHaveBeenCalledTimes(3);
    await act(async () => finishRecovery(fixtures.projectDetails({ ...project, tasks: { total: 3, completed: 1, active: 3, archived: 0 }, progress: 33 }, [fixtures.projectTask(), fixtures.projectTask({ id: 'task-2', status: 'done' }), confirmed])));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Réessayer la fiche' })).toBeNull());
    expect(screen.getByRole('heading', { name: confirmed.title, level: 4 })).toBeTruthy();
    expect(screen.getByText(/tâches terminées$/).textContent).toBe('1/3 tâches terminées'); // MAIR-846: « Avancement » metric
    expect(createProjectTask).toHaveBeenCalledTimes(1);
    expect(createProjectTask.mock.calls[0][1].title).toBe('Brouillon soumis');
  });

  it.each([false, true])("keeps the newest project selection when the earlier detail settles late (refused: %s)", async refused => {
    const user = userEvent.setup();
    const first = fixtures.projectListItem();
    const second = fixtures.projectListItem({ id: 'project-2', title: 'Projet choisi ensuite' });
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([first, second]));
    let resolveFirst, rejectFirst;
    vi.mocked(getProjectDetails).mockImplementationOnce(() => new Promise((resolve, reject) => {
      resolveFirst = resolve; rejectFirst = reject;
    })).mockResolvedValueOnce(fixtures.projectDetails(second));
    render(<ProjectsPage />);
    await user.click(await screen.findByRole('button', { name: `Ouvrir la fiche du projet ${first.title}` }));
    await user.click(screen.getByRole('button', { name: `Ouvrir la fiche du projet ${second.title}` }));
    expect(await screen.findByRole('heading', { level: 1, name: second.title })).toBeTruthy();
    await act(async () => {
      if (refused) rejectFirst(new Error('Erreur ancienne hors contexte'));
      else resolveFirst(fixtures.projectDetails(first));
    });
    expect(screen.getByRole('heading', { level: 1, name: second.title })).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1, name: first.title })).toBeNull();
    expect(screen.queryByText('Erreur ancienne hors contexte')).toBeNull();
    expect(getProjectDetails.mock.calls.map(([id]) => id)).toEqual([first.id, second.id]);
    // MAIR-846: the URL names the project shown, the last one chosen.
    expect(new URLSearchParams(window.location.search).get('project')).toBe(second.id);
    await leaveProject(user);
  });

  it.each([false, true])("keeps the current view after pending duplication and GET-only recovery (refused refresh: %s)", async (refusedRefresh) => {
    const user = userEvent.setup();
    const project = fixtures.projectListItem();
    const copy = fixtures.projectListItem({ id: "project-confirmed-copy", title: "Éclairage copie confirmée" });
    const pageBody = (query, rows) => fixtures.projectsPage(rows, {
      pagination: { page: query.page, limit: 50, total: 85, hasNextPage: query.page === 1 },
    });
    vi.mocked(getProjectsPage).mockImplementation(async query => pageBody(query, [project]));
    let resolveCopy;
    vi.mocked(duplicateProject).mockImplementationOnce(() => new Promise(resolve => { resolveCopy = resolve; }));
    render(<ProjectsPage />);
    await user.click(await screen.findByRole("button", { name: `Actions pour ${project.title}` }));
    await user.click(screen.getByRole("menuitem", { name: "Dupliquer" }));
    expect(await screen.findByText("Duplication du projet en cours…")).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: "Grille" }));
    await user.type(screen.getByPlaceholderText("Rechercher des projets..."), "éclairage");
    await waitFor(() => {
      const query = getProjectsPage.mock.calls.at(-1)[0];
      expect(query.view).toBe("grid");
      expect(query.q).toBe("éclairage");
      expect(screen.getByRole("button", { name: "Suivant" }).disabled).toBe(false);
    });
    await user.click(screen.getByRole("button", { name: "Suivant" }));
    expect(await screen.findByText("51 – 85 sur 85 projets")).toBeTruthy();
    vi.mocked(getProjectsPage).mockImplementation(async query => {
      if (refusedRefresh) throw new Error("Lecture après copie refusée");
      return pageBody(query, [project, copy]);
    });
    resolveCopy(fixtures.projectDetails(copy));
    await waitFor(() => expect(screen.queryByText("Duplication du projet en cours…")).toBeNull());
    const expectedQuery = { q: undefined, status: "all", priority: "all", dueBefore: undefined, view: "grid", page: 1, limit: 50 };
    expect(getProjectsPage.mock.calls.at(-1)[0]).toEqual(expectedQuery);
    expect(screen.getByPlaceholderText("Rechercher des projets...").value).toBe("");
    expect(screen.getByRole("radio", { name: "Grille" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("button", { name: `Ouvrir la fiche du projet ${copy.title}` })).toBeTruthy();
    if (refusedRefresh) {
      expect(await screen.findByText("Lecture après copie refusée")).toBeTruthy();
      expect(screen.getByText("51 – 85 sur 85 projets")).toBeTruthy();
      vi.mocked(getProjectsPage).mockImplementation(async query => pageBody(query, [project, copy]));
      screen.getByRole("button", { name: "Réessayer" }).focus();
      await user.keyboard("{Enter}");
      expect(await screen.findByText("1 – 50 sur 85 projets")).toBeTruthy();
      expect(screen.queryByText("Lecture après copie refusée")).toBeNull();
      expect(getProjectsPage.mock.calls.at(-1)[0]).toEqual(expectedQuery);
    }
    expect(duplicateProject).toHaveBeenCalledExactlyOnceWith(project.id);
  });

  it("paginates the real page by keyboard using confirmed BFF metadata", async () => {
    const user = userEvent.setup();
    vi.mocked(getProjectsPage).mockImplementation(async ({ page }) => fixtures.projectsPage([
      fixtures.projectListItem({ id: `project-${page}`, title: `Projet page ${page}` }),
    ], { pagination: { page, limit: 50, total: 85, hasNextPage: page === 1 } }));
    render(<ProjectsPage />);
    expect(await screen.findByText("1 – 50 sur 85 projets")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Précédent" }).disabled).toBe(true);
    screen.getByRole("button", { name: "Suivant" }).focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByText("51 – 85 sur 85 projets")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Suivant" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Précédent" }).disabled).toBe(false);
    expect(screen.queryByText("Projet page 1")).toBeNull();
    expect(getProjectsPage.mock.calls.map(([query]) => query.page)).toEqual([1, 2]);
    await user.click(screen.getByRole("button", { name: "Précédent" }));
    expect(await screen.findByText("1 – 50 sur 85 projets")).toBeTruthy();
    expect(getProjectsPage.mock.calls.map(([query]) => query.page)).toEqual([1, 2, 1]);
  });

  it("guards pending paging, keeps the last confirmed page on refusal and retries only that GET", async () => {
    const user = userEvent.setup();
    let rejectRead;
    vi.mocked(getProjectsPage)
      .mockResolvedValueOnce(fixtures.projectsPage([fixtures.projectListItem()], {
        pagination: { page: 1, limit: 50, total: 85, hasNextPage: true },
      }))
      .mockImplementationOnce(() => new Promise((resolve, reject) => { rejectRead = reject; }));
    render(<ProjectsPage />);
    expect(await screen.findByText("1 – 50 sur 85 projets")).toBeTruthy();
    await user.dblClick(screen.getByRole("button", { name: "Suivant" }));
    await waitFor(() => expect(getProjectsPage).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Suivant" }).disabled).toBe(true);
    rejectRead(new Error("Page suivante indisponible"));
    expect(await screen.findByText("Page suivante indisponible")).toBeTruthy();
    expect(screen.getByText("1 – 50 sur 85 projets")).toBeTruthy();
    expect(screen.getByRole("button", { name: `Ouvrir la fiche du projet ${fixtures.projectListItem().title}` })).toBeTruthy();
    vi.mocked(getProjectsPage).mockResolvedValueOnce(fixtures.projectsPage([], {
      pagination: { page: 2, limit: 50, total: 85, hasNextPage: false },
    }));
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText("51 – 85 sur 85 projets")).toBeTruthy();
    expect(getProjectsPage.mock.calls.map(([query]) => query.page)).toEqual([1, 2, 2]);
    expect(screen.queryByText("Page suivante indisponible")).toBeNull();
  });

  it.each([
    { page: 0, limit: 50, total: -1, hasNextPage: true },
    null,
    { page: 1, limit: 50, total: 85, hasNextPage: false },
  ])("rejects inconsistent paging metadata %j without fabricating a total and can recover", async (pagination) => {
    const user = userEvent.setup();
    vi.mocked(getProjectsPage).mockResolvedValueOnce(fixtures.projectsPage([], {
      pagination,
    }));
    render(<ProjectsPage />);
    expect(await screen.findByText("La pagination reçue est incohérente. Réessayez le chargement des projets.")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Pagination des projets" })).toBeNull();
    vi.mocked(getProjectsPage).mockResolvedValueOnce(fixtures.projectsPage([]));
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText("0 projets")).toBeTruthy();
  });

  it("shows loading and then an empty BFF-backed board without inventing a project", async () => {
    render(<ProjectsPage />);

    expect(screen.getByText("Chargement des projets...")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("Chargement des projets...")).toBeNull());
    expect(getProjectsPage).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading", { name: "Projets", level: 1 })).toBeTruthy();
    expect(screen.queryByRole("group", { name: fixtures.projectListItem().title })).toBeNull();
  });

  it("shows a BFF failure without rendering a fabricated project", async () => {
    vi.mocked(getProjectsPage).mockRejectedValue(new Error("Service projets indisponible"));
    render(<ProjectsPage />);

    expect(await screen.findByText("Service projets indisponible")).toBeTruthy();
    expect(screen.queryByRole("group", { name: fixtures.projectListItem().title })).toBeNull();
  });

  it("keeps the filters on one row and the view switch on its own row under them (MAIR-1134 C6)", async () => {
    render(<ProjectsPage />);
    await waitFor(() => expect(screen.queryByText("Chargement des projets...")).toBeNull());

    // MAIR-828: the toolbar holds lib controls; its responsive layout stays in the front.
    const toolbar = screen.getByRole("region", { name: "Filtres des projets" }).firstElementChild;
    const controls = toolbar.firstElementChild;
    const searchContainer = controls.firstElementChild;

    expect(searchContainer.contains(screen.getByRole("searchbox", { name: "Rechercher un projet" }))).toBe(true);
    expect(controls.classList.contains("w-full")).toBe(true);
    expect(controls.classList.contains("xl:flex-row")).toBe(true);
    expect(controls.classList.contains("md:flex-row")).toBe(false);
    expect(toolbar.classList.contains("items-start")).toBe(true);
    expect(toolbar.classList.contains("flex-col")).toBe(true);
    // The view switch never moves: its own row, left aligned, whatever the screen width.
    expect([...toolbar.classList].some((name) => /flex-row/.test(name))).toBe(false);
    expect(toolbar.lastElementChild).toBe(screen.getByRole("radiogroup", { name: "Vue des projets" }));
    expect(searchContainer.classList.contains("md:min-w-[280px]")).toBe(true);
    expect(searchContainer.classList.contains("2xl:min-w-[240px]")).toBe(true);
    expect(searchContainer.classList.contains("md:flex-1")).toBe(true);
    expect(screen.getByRole("radiogroup", { name: "Vue des projets" })).toBeTruthy();
  });

  it("opens the requested BFF-backed project and highlights its task", async () => {
    const project = fixtures.projectListItem();
    const task = fixtures.projectTask();
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockResolvedValue(fixtures.projectDetails(project, [task]));
    window.history.replaceState({}, "", `/?source=dashboard&project=${project.id}&task=${task.id}`);

    const { container } = render(<ProjectsPage />);

    // MAIR-846: the link opens the project page on its « Tâches » tab.
    expect(await screen.findByRole("heading", { name: project.title, level: 1 })).toBeTruthy();
    expect(getProjectDetails).toHaveBeenCalledExactlyOnceWith(project.id);
    expect(screen.getByRole("tab", { name: /^Tâches/ }).getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector(`[data-linked-task="${task.id}"]`)).toBeTruthy();
    expect(within(screen.getByRole("tabpanel")).getByText(task.title)).toBeTruthy();
    await waitFor(() => {
      expect(document.activeElement).toBe(container.querySelector(`[data-linked-task="${task.id}"]`));
    });
  });

  it("opens a project as an addressable page, follows the browser history and returns the focus to the opener (MAIR-846)", async () => {
    const user = userEvent.setup();
    const project = fixtures.projectListItem();
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockResolvedValue(fixtures.projectDetails(project));
    window.history.replaceState({}, "", "/?view=kanban");
    render(<ProjectsPage />);

    const opener = await screen.findByRole("button", { name: `Ouvrir la fiche du projet ${project.title}` });
    await user.click(opener);
    const title = await screen.findByRole("heading", { level: 1, name: project.title });
    const page = title.closest("section");
    expect(page.getAttribute("role")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(title);
    expect(window.location.search).toBe(`?view=kanban&project=${project.id}`);
    expect(screen.queryByRole("button", { name: `Ouvrir la fiche du projet ${project.title}` })).toBeNull();

    // The tab is kept in the URL so that a reload comes back to it.
    await user.click(screen.getByRole("tab", { name: "Planning" }));
    expect(window.location.search).toBe(`?view=kanban&project=${project.id}&tab=planning`);
    await user.click(screen.getByRole("tab", { name: "Vue d’ensemble" }));
    expect(window.location.search).toBe(`?view=kanban&project=${project.id}`);

    const results = await axe(page);
    expect(results.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);

    await user.click(within(page).getByRole("button", { name: "Projets" }));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 1, name: project.title })).toBeNull());
    expect(window.location.search).toBe("?view=kanban");
    expect(document.activeElement).toBe(opener);

    // Back / Forward of the browser follow the page.
    await act(async () => { window.history.back(); await new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true })); });
    expect(await screen.findByRole("heading", { level: 1, name: project.title })).toBeTruthy();
    expect(getProjectDetails).toHaveBeenCalledTimes(2);
    await act(async () => { window.history.forward(); await new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true })); });
    await waitFor(() => expect(screen.queryByRole("heading", { level: 1, name: project.title })).toBeNull());
    expect(screen.getByRole("button", { name: `Ouvrir la fiche du projet ${project.title}` })).toBeTruthy();
  });

});

it('wires the existing Login identity to a received Project member only when the detail is opened', async () => {
  const user=userEvent.setup(), project=fixtures.projectListItem();
  const page=fixtures.projectsPage([project]);
  // The fixtures already identify members as user-<n>, like the published BFF_Project contract.
  vi.mocked(getProjectsPage).mockResolvedValue(page);
  vi.mocked(getProjectDetails).mockResolvedValue(fixtures.projectDetails(project,[]));
  const fetch=vi.fn().mockResolvedValue(Response.json({id:'1'}));vi.stubGlobal('fetch',fetch);
  try {
    render(<ProjectsPage />);
    const opener=await screen.findByRole('button',{name:`Ouvrir la fiche du projet ${project.title}`});
    expect(fetch).not.toHaveBeenCalled();await user.click(opener);
    await tasksTab(user);
    await user.click(screen.getByRole('button',{name:'Nouvelle tâche'}));
    await screen.findByRole('button',{name:'Retirer Admin Mairie'});
    // Besides the Login identity, opening reads only the project statuses and archived tasks (MAIR-567).
    const urls=fetch.mock.calls.map(([input])=>String(input instanceof Request?input.url:input));
    expect(urls.filter(url=>url==='/api/auth/current-user')).toHaveLength(1);
    expect(urls[0]).toBe('/api/auth/current-user');
    expect(urls.filter(url=>url!=='/api/auth/current-user').every(url=>/\/projects\/[^/]+\/(statuses|archived-tasks)(\?|$)/.test(new URL(url,'http://front').pathname+new URL(url,'http://front').search))).toBe(true);
  } finally {vi.unstubAllGlobals();}
});

it('hydrates a confirmed server page under StrictMode and reads the next page exactly once', async () => {
  window.history.replaceState({}, '', '/?view=table');
  const project = fixtures.projectListItem();
  const data = fixtures.projectsPage([project], { pagination: { page: 1, limit: 50, total: 85, hasNextPage: true } });
  const initial = { status: 'confirmed', data, query: { q: '', status: 'all', priority: 'all', dueBefore: '', view: 'table', page: '1' } };
  const next = { ...project, id: 'project-2', title: 'Confirmed second server project page' };
  vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([next], { pagination: { page: 2, limit: 50, total: 85, hasNextPage: false } }));
  const user = userEvent.setup();
  render(<StrictMode><ProjectsPage initial={initial} /></StrictMode>);
  expect(screen.getByText(project.title, { exact: true })).toBeTruthy();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 320)); });
  expect(getProjectsPage).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Suivant' }));
  await screen.findByText(next.title, { exact: true });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 320)); });
  expect(getProjectsPage).toHaveBeenCalledOnce();
  expect(vi.mocked(getProjectsPage).mock.calls[0][0].page).toBe(2);
});
