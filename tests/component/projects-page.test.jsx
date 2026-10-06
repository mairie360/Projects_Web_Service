import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectsPage from "@/app/page";
import { closeProject, createProjectTask, deleteProjectTask, duplicateProject, getProjectDetails, getProjectsPage, updateProject, updateProjectTask, updateProjectTaskStatus } from "@/lib/bffProjectClient";
import fixtures from "../support/bff-fixtures.cjs";

vi.mock("@/lib/bffProjectClient", async (importOriginal) => ({
  ...(await importOriginal()),
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
  vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([]));
  vi.mocked(getProjectDetails).mockResolvedValue(fixtures.projectDetails());
  vi.mocked(duplicateProject).mockReset();
  vi.mocked(createProjectTask).mockReset();
  vi.mocked(deleteProjectTask).mockReset();
  vi.mocked(updateProjectTaskStatus).mockReset();
  vi.mocked(updateProjectTask).mockReset();
  vi.mocked(closeProject).mockReset();
  vi.mocked(updateProject).mockReset();
});

describe("Projects page", () => {
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

  it('keeps a card draft and unsent local task after an uncertain project receipt until keyboard GET verification', async () => {
    const user=userEvent.setup(), project=fixtures.projectListItem({dueDate:'2026-12-15'});
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails(project));
    vi.mocked(updateProject).mockResolvedValueOnce(fixtures.projectDetails({...project,id:'project-2',title:'Projet étranger interdit'}));
    render(<ProjectsPage/>);
    await user.click(await screen.findByRole('button',{name:`Actions pour ${project.title}`}));
    await user.click(screen.getByRole('menuitem',{name:'Modifier',exact:true}));
    const dialog=await screen.findByRole('dialog',{name:'Modifier le projet'}), form=within(dialog);
    const title=form.getByRole('textbox',{name:'Titre*',exact:true});
    await user.clear(title);await user.type(title,'Brouillon qui reste à moi');
    const nested=form.getByPlaceholderText('Ajouter une tâche...');await user.type(nested,'Tâche non ajoutée');
    await user.click(form.getByRole('button',{name:'Enregistrer',exact:true}));
    expect(await form.findByRole('alert')).toHaveProperty('textContent',expect.stringMatching(/acceptée.*confirmation de projet.*incohérente/));
    expect(form.getByRole('button',{name:'Enregistrer',exact:true}).disabled).toBe(true);
    expect(title.value).toBe('Brouillon qui reste à moi');expect(nested.value).toBe('Tâche non ajoutée');
    expect(screen.queryByText('Projet étranger interdit')).toBeNull();
    vi.mocked(getProjectDetails).mockRejectedValueOnce(new Error('Lecture indisponible pour vérifier'));
    const verify=form.getByRole('button',{name:'Vérifier le projet',exact:true});verify.focus();await user.keyboard('{Enter}');
    await form.findByText('Lecture indisponible pour vérifier');
    expect(form.getByRole('button',{name:'Enregistrer',exact:true}).disabled).toBe(true);
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails({...project,title:'Lecture officielle du projet'}));
    verify.focus();await user.keyboard('{Enter}');
    await waitFor(()=>expect(form.getByRole('button',{name:'Enregistrer',exact:true}).disabled).toBe(false));
    expect(title.value).toBe('Brouillon qui reste à moi');expect(nested.value).toBe('Tâche non ajoutée');
    expect(form.queryByRole('alert')).toBeNull();expect(updateProject).toHaveBeenCalledOnce();expect(getProjectDetails).toHaveBeenCalledTimes(3);
  });

  it('retains inline project fields and consumes a newly denied edit permission after verification',async()=>{
    const user=userEvent.setup(),project=fixtures.projectListItem({dueDate:'2026-12-15'});
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails(project,[]));
    vi.mocked(updateProject).mockResolvedValueOnce(fixtures.projectDetails({...project,id:'project-2'},[]));
    render(<ProjectsPage/>);
    await user.click(await screen.findByRole('button',{name:`Ouvrir la fiche du projet ${project.title}`}));
    const dialog=await screen.findByRole('dialog'),detail=within(dialog);
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
    const detail=within(await screen.findByRole('dialog'));await user.click(detail.getByRole('button',{name:'Clôturer',exact:true}));
    await waitFor(()=>expect(detail.getByRole('button',{name:'Clôturer',exact:true}).disabled).toBe(true));
    detail.getByRole('button',{name:'Fermer la fiche projet',exact:true}).focus();
    await user.keyboard('{Escape}');expect(screen.queryByRole('dialog')).toBeNull();
    const read=Promise.withResolvers();vi.mocked(getProjectDetails).mockImplementationOnce(()=>read.promise);
    const verify=screen.getByRole('button',{name:`Vérifier le projet ${project.title}`,exact:true});
    verify.focus();await user.keyboard('{Enter}');await user.click(verify);
    expect(verify.disabled).toBe(true);expect(getProjectDetails).toHaveBeenCalledTimes(2);
    await act(async()=>read.resolve(fixtures.projectDetails({...project,title:'Projet vérifié sans répéter'},[])));
    await waitFor(()=>expect(screen.queryByRole('button',{name:`Vérifier le projet ${project.title}`,exact:true})).toBeNull());
    expect(screen.getByRole('button',{name:`Ouvrir la fiche du projet ${other.title}`})).toBeTruthy();
    expect(screen.queryByText('Titre étranger ne pas afficher')).toBeNull();expect(closeProject).toHaveBeenCalledOnce();
  });

  it.each([false, true])('retains the latest card form and its typed draft after an obsolete read (refused: %s)', async refused => {
    const user = userEvent.setup();
    const first = fixtures.projectListItem();
    const second = fixtures.projectListItem({ id: 'project-2', title: 'Projet choisi ensuite' });
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([first, second]));
    const earlier = Promise.withResolvers();
    vi.mocked(getProjectDetails).mockImplementationOnce(() => earlier.promise)
      .mockResolvedValueOnce(fixtures.projectDetails(second));
    render(<ProjectsPage />);
    await user.click(await screen.findByRole('button', { name: `Actions pour ${first.title}` }));
    await user.click(screen.getByRole('menuitem', { name: 'Modifier', exact: true }));
    const opener = screen.getByRole('button', { name: `Actions pour ${second.title}` });
    await user.click(opener);
    await user.click(screen.getByRole('menuitem', { name: 'Modifier', exact: true }));
    const dialog = await screen.findByRole('dialog', { name: 'Modifier le projet' });
    const title = within(dialog).getByRole('textbox', { name: 'Titre*', exact: true });
    expect(title.value).toBe(second.title);
    await user.clear(title); await user.type(title, 'Brouillon du projet choisi ensuite');
    await act(async () => refused ? earlier.reject(new Error('Ancienne lecture refusée')) : earlier.resolve(fixtures.projectDetails(first)));
    expect(title.value).toBe('Brouillon du projet choisi ensuite');
    expect(screen.queryByText('Ancienne lecture refusée')).toBeNull();
    expect(getProjectDetails.mock.calls.map(([id]) => id)).toEqual([first.id, second.id]);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('preserves a creation and its unsent nested task while an old card opening finishes', async () => {
    const user = userEvent.setup();
    const project = fixtures.projectListItem();
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    const earlier = Promise.withResolvers();
    vi.mocked(getProjectDetails).mockImplementationOnce(() => earlier.promise);
    render(<ProjectsPage />);
    await user.click(await screen.findByRole('button', { name: `Actions pour ${project.title}` }));
    await user.click(screen.getByRole('menuitem', { name: 'Modifier', exact: true }));
    const opener = screen.getByRole('button', { name: 'Nouveau projet', exact: true });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Nouveau projet' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Titre*', exact: true }), 'Brouillon de création');
    await user.type(within(dialog).getByPlaceholderText('Ajouter une tâche...'), 'Tâche non envoyée');
    await act(async () => earlier.resolve(fixtures.projectDetails(project)));
    expect(screen.getByRole('dialog', { name: 'Nouveau projet' })).toBe(dialog);
    expect(within(dialog).getByRole('textbox', { name: 'Titre*', exact: true }).value).toBe('Brouillon de création');
    expect(within(dialog).getByPlaceholderText('Ajouter une tâche...').value).toBe('Tâche non envoyée');
    expect(getProjectDetails).toHaveBeenCalledTimes(1);
    const close = within(dialog).getByRole('button', { name: 'Fermer la création de projet' });
    close.focus(); await user.keyboard('{Enter}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('announces the current read fallback inside its correctly targeted card form', async () => {
    const user = userEvent.setup();
    const project = fixtures.projectListItem();
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockRejectedValueOnce(new Error('Chargement récent indisponible'));
    render(<ProjectsPage />);
    await user.click(await screen.findByRole('button', { name: `Actions pour ${project.title}` }));
    await user.click(screen.getByRole('menuitem', { name: 'Modifier', exact: true }));
    const dialog = await screen.findByRole('dialog', { name: 'Modifier le projet' });
    expect(within(dialog).getByRole('textbox', { name: 'Titre*', exact: true }).value).toBe(project.title);
    expect(within(dialog).getByRole('alert').textContent).toContain('Chargement récent indisponible');
    expect(within(dialog).getByRole('alert').textContent).toContain('projet déjà affiché');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
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
    expect(closeProject).toHaveBeenCalledTimes(1);
    const row = screen.getByRole('heading', { name: task.title }).closest('article');
    await user.click(within(row).getByRole('button', { name: 'Modifier', exact: true }));
    const title = screen.getByRole('textbox', { name: 'Titre de la tâche' });
    await user.clear(title); await user.type(title, 'Brouillon à conserver');
    const confirmed = fixtures.projectTask({ title: 'Tâche confirmée récemment', status: 'done' });
    const verified = { ...confirmed, title: 'Tâche enrichie par lecture' };
    vi.mocked(updateProjectTaskStatus).mockResolvedValueOnce(confirmed);
    vi.mocked(getProjectsPage).mockRejectedValue(new Error('Liste temporairement refusée'));
    if (successfulRead) vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails(project, [verified, other]));
    else vi.mocked(getProjectDetails).mockRejectedValueOnce(new Error('Détail temporairement refusé'));
    await user.click(within(row).getByRole('button', { name: `Marquer ${task.title} comme terminée` }));
    const expected = successfulRead ? verified.title : confirmed.title;
    expect(await screen.findByRole('heading', { name: expected })).toBeTruthy();
    await act(async () => write.resolve(fixtures.projectDetails({ ...project, title: 'Projet confirmé tardivement', status: 'review', progress: 17, tasks: { total: 9, completed: 2 } }, [task, other])));
    expect(await screen.findByRole('dialog', { name: 'Projet confirmé tardivement' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: expected })).toBeTruthy();
    expect(screen.getByRole('heading', { name: other.title })).toBeTruthy();
    expect(title.value).toBe('Brouillon à conserver');
    expect(screen.getByText('Tâches').parentElement.textContent).toContain('2/9');
    expect(screen.getByRole('button', { name: 'Réessayer la fiche' }).disabled).toBe(false);
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails({ ...project, title: 'Projet confirmé tardivement', tasks: { total: 2, completed: 1 }, progress: 50 }, [verified, other]));
    screen.getByRole('button', { name: 'Réessayer la fiche' }).focus(); await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Réessayer la fiche' })).toBeNull());
    expect(screen.getByRole('heading', { name: verified.title })).toBeTruthy();
    expect(title.value).toBe('Brouillon à conserver');
    expect(screen.getByText('Tâches').parentElement.textContent).toContain('1/2');
    expect(closeProject).toHaveBeenCalledTimes(1);
    expect(updateProjectTaskStatus).toHaveBeenCalledTimes(1);
    screen.getByRole('button', { name: 'Fermer la fiche projet' }).focus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
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
    const row = screen.getByRole('heading', { name: task.title }).closest('article');
    await user.click(within(row).getByRole('button', { name: 'Modifier', exact: true }));
    const title = screen.getByRole('textbox', { name: 'Titre de la tâche' });
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
    expect(within(screen.getByRole('form', { name: 'Modifier une tâche' })).getByRole('alert').textContent).toBe('Le titre de la tâche est obligatoire.');
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
    const row = screen.getByRole('heading', { name: task.title }).closest('article');
    await user.click(within(row).getByRole('button', { name: 'Modifier', exact: true }));
    const title = screen.getByRole('textbox', { name: 'Titre de la tâche' });
    await user.clear(title); await user.type(title, 'Brouillon à garder');
    vi.mocked(getProjectDetails).mockRejectedValueOnce(new Error('Vérification indisponible'));
    await user.click(within(row).getByRole('button', { name: `Marquer ${task.title} comme terminée` }));
    const rowAlert = await within(row).findByRole('alert');
    expect(rowAlert.textContent).toContain('acceptée');
    expect(rowAlert.textContent).toContain('confirmation de tâche est incohérente');
    expect(screen.queryByRole('heading', { name: 'Mauvaise confirmation reçue' })).toBeNull();
    expect(screen.getByRole('heading', { name: other.title })).toBeTruthy();
    expect(title.value).toBe('Brouillon à garder');
    expect(screen.getByRole('button', { name: 'Enregistrer la tâche' }).disabled).toBe(true);
    expect(within(row).getByRole('combobox').disabled).toBe(true);
    expect(within(row).getByRole('button', { name: `Supprimer ${task.title}` }).disabled).toBe(true);
    const otherRow = screen.getByRole('heading', { name: other.title }).closest('article');
    expect(within(otherRow).getByRole('combobox').disabled).toBe(false);
    expect(screen.getByRole('button', { name: 'Réessayer la fiche' }).disabled).toBe(false);
    const verified = fixtures.projectTask({ title: 'Titre vérifié par lecture' });
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails(project, [verified, other]));
    screen.getByRole('button', { name: 'Réessayer la fiche' }).focus(); await user.keyboard('{Enter}');
    expect(await screen.findByRole('heading', { name: verified.title })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Enregistrer la tâche' }).disabled).toBe(false);
    expect(screen.getByRole('textbox', { name: 'Titre de la tâche' }).value).toBe('Brouillon à garder');
    expect(updateProjectTaskStatus).toHaveBeenCalledTimes(1);
  });

  it("shows a scoped pending status guard, retains an edit draft and leaves other tasks usable", async () => {
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
    const firstRow = screen.getByRole('heading', { name: task.title }).closest('article');
    const otherRow = screen.getByRole('heading', { name: other.title }).closest('article');
    await user.click(within(firstRow).getByRole('button', { name: 'Modifier', exact: true }));
    const title = screen.getByRole('textbox', { name: 'Titre de la tâche' });
    await user.clear(title);
    await user.type(title, 'Brouillon conservé');
    const toggle = within(firstRow).getByRole('button', { name: `Marquer ${task.title} comme terminée` });
    await user.dblClick(toggle);
    expect(updateProjectTaskStatus).toHaveBeenCalledTimes(1);
    expect(firstRow.getAttribute('aria-busy')).toBe('true');
    expect(within(firstRow).getByRole('status').textContent).toBe('Opération sur la tâche en cours…');
    expect(toggle.disabled).toBe(true);
    expect(within(firstRow).getByRole('combobox', { name: `Statut de ${task.title}` }).disabled).toBe(true);
    expect(within(firstRow).getByRole('button', { name: `Supprimer ${task.title}` }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Enregistrer la tâche' }).disabled).toBe(true);
    expect(within(otherRow).getByRole('combobox', { name: `Statut de ${other.title}` }).disabled).toBe(false);
    expect(title.value).toBe('Brouillon conservé');
    await act(async () => write.reject(new Error('Écriture refusée')));
    expect(await within(firstRow).findByRole('alert')).toBeTruthy();
    expect(within(firstRow).getByRole('alert').textContent).toContain('Écriture refusée');
    expect(toggle.disabled).toBe(false);
    expect(firstRow.getAttribute('aria-busy')).toBeNull();
    expect(title.value).toBe('Brouillon conservé');
    const confirmed = fixtures.projectTask({ title: 'Statut canonique reçu', status: 'done', completed: true });
    vi.mocked(updateProjectTaskStatus).mockResolvedValueOnce(confirmed);
    vi.mocked(getProjectDetails).mockRejectedValueOnce(new Error('Relecture refusée'));
    toggle.focus(); await user.keyboard('{Enter}');
    expect(await screen.findByRole('heading', { name: confirmed.title })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Titre de la tâche' }).value).toBe('Brouillon conservé');
    expect(screen.getByRole('button', { name: 'Réessayer la fiche' }).disabled).toBe(false);
    expect(updateProjectTaskStatus).toHaveBeenCalledTimes(2);
  });

  it("guards a pending delete, retains other rows and retries only the refused read", async () => {
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
    const firstRow = screen.getByRole('heading', { name: task.title }).closest('article');
    await user.click(within(firstRow).getByRole('button', { name: `Supprimer ${task.title}` }));
    await user.click(within(firstRow).getByRole('button', { name: 'Supprimer', exact: true }));
    expect(firstRow.getAttribute('aria-busy')).toBe('true');
    expect(within(firstRow).getByRole('button', { name: `Supprimer ${task.title}` }).disabled).toBe(true);
    await user.dblClick(within(firstRow).getByRole('button', { name: `Supprimer ${task.title}` }));
    expect(deleteProjectTask).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: task.title })).toBeTruthy();
    const otherRow = screen.getByRole('heading', { name: other.title }).closest('article');
    expect(within(otherRow).getByRole('combobox', { name: `Statut de ${other.title}` }).disabled).toBe(false);
    vi.mocked(getProjectDetails).mockRejectedValueOnce(new Error('Relecture refusée'));
    await act(async () => write.resolve());
    expect(await screen.findByRole('button', { name: 'Réessayer la fiche' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: task.title })).toBeNull();
    expect(screen.getByRole('heading', { name: other.title })).toBeTruthy();
    vi.mocked(getProjectDetails).mockResolvedValueOnce(fixtures.projectDetails({ ...project, tasks: { total: 1, completed: 0 } }, [other]));
    screen.getByRole('button', { name: 'Réessayer la fiche' }).focus(); await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Réessayer la fiche' })).toBeNull());
    expect(deleteProjectTask).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Tâches').parentElement.textContent).toContain('0/1');
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
    await user.type(screen.getByRole('textbox', { name: 'Titre de la tâche' }), 'Brouillon soumis');
    await user.click(screen.getByRole('button', { name: 'Ajouter la tâche', exact: true }));
    expect(await screen.findByRole('heading', { name: confirmed.title, level: 3 })).toBeTruthy();
    expect(screen.getByText('Les tâches confirmées restent affichées. Les compteurs et la progression restent ceux de la dernière réponse projet reçue.')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Titre de la tâche' }).value).toBe('');
    expect(screen.getByText('Tâches').parentElement.textContent).toContain('1/2');
    const retry = screen.getByRole('button', { name: 'Réessayer la fiche' });
    retry.focus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(getProjectDetails).toHaveBeenCalledTimes(3));
    expect(retry.disabled).toBe(true);
    expect(retry.getAttribute('aria-busy')).toBe('true');
    await user.dblClick(retry);
    expect(getProjectDetails).toHaveBeenCalledTimes(3);
    await act(async () => finishRecovery(fixtures.projectDetails({ ...project, tasks: { total: 3, completed: 1 }, progress: 33 }, [fixtures.projectTask(), fixtures.projectTask({ id: 'task-2', status: 'done' }), confirmed])));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Réessayer la fiche' })).toBeNull());
    expect(screen.getByRole('heading', { name: confirmed.title, level: 3 })).toBeTruthy();
    expect(screen.getByText('Tâches').parentElement.textContent).toContain('1/3');
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
    expect(await screen.findByRole('dialog', { name: second.title })).toBeTruthy();
    await act(async () => {
      if (refused) rejectFirst(new Error('Erreur ancienne hors contexte'));
      else resolveFirst(fixtures.projectDetails(first));
    });
    expect(screen.getByRole('dialog', { name: second.title })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: first.title })).toBeNull();
    expect(screen.queryByText('Erreur ancienne hors contexte')).toBeNull();
    expect(getProjectDetails.mock.calls.map(([id]) => id)).toEqual([first.id, second.id]);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
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
    await user.click(screen.getByRole("tab", { name: "Grille" }));
    await user.type(screen.getByPlaceholderText("Rechercher des projets..."), "éclairage");
    await waitFor(() => {
      const query = getProjectsPage.mock.calls.at(-1)[0];
      expect(query.view).toBe("grid");
      expect(query.q).toBe("éclairage");
      expect(screen.getByRole("button", { name: "Page suivante" }).disabled).toBe(false);
    });
    await user.click(screen.getByRole("button", { name: "Page suivante" }));
    expect(await screen.findByText("Page 2 · 85 projets")).toBeTruthy();
    vi.mocked(getProjectsPage).mockImplementation(async query => {
      if (refusedRefresh) throw new Error("Lecture après copie refusée");
      return pageBody(query, [project, copy]);
    });
    resolveCopy(fixtures.projectDetails(copy));
    await waitFor(() => expect(screen.queryByText("Duplication du projet en cours…")).toBeNull());
    const expectedQuery = { q: undefined, status: "all", priority: "all", dueBefore: undefined, view: "grid", page: 1, limit: 50 };
    expect(getProjectsPage.mock.calls.at(-1)[0]).toEqual(expectedQuery);
    expect(screen.getByPlaceholderText("Rechercher des projets...").value).toBe("");
    expect(screen.getByRole("tab", { name: "Grille" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("button", { name: `Ouvrir la fiche du projet ${copy.title}` })).toBeTruthy();
    if (refusedRefresh) {
      expect(await screen.findByText("Lecture après copie refusée")).toBeTruthy();
      expect(screen.getByText("Page 2 · 85 projets")).toBeTruthy();
      vi.mocked(getProjectsPage).mockImplementation(async query => pageBody(query, [project, copy]));
      screen.getByRole("button", { name: "Réessayer" }).focus();
      await user.keyboard("{Enter}");
      expect(await screen.findByText("Page 1 · 85 projets")).toBeTruthy();
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
    expect(await screen.findByText("Page 1 · 85 projets")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Page précédente" }).disabled).toBe(true);
    screen.getByRole("button", { name: "Page suivante" }).focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Page 2 · 85 projets")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Page suivante" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Page précédente" }).disabled).toBe(false);
    expect(screen.queryByText("Projet page 1")).toBeNull();
    expect(getProjectsPage.mock.calls.map(([query]) => query.page)).toEqual([1, 2]);
    await user.click(screen.getByRole("button", { name: "Page précédente" }));
    expect(await screen.findByText("Page 1 · 85 projets")).toBeTruthy();
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
    expect(await screen.findByText("Page 1 · 85 projets")).toBeTruthy();
    await user.dblClick(screen.getByRole("button", { name: "Page suivante" }));
    await waitFor(() => expect(getProjectsPage).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Page suivante" }).disabled).toBe(true);
    rejectRead(new Error("Page suivante indisponible"));
    expect(await screen.findByText("Page suivante indisponible")).toBeTruthy();
    expect(screen.getByText("Page 1 · 85 projets")).toBeTruthy();
    expect(screen.getByRole("button", { name: `Ouvrir la fiche du projet ${fixtures.projectListItem().title}` })).toBeTruthy();
    vi.mocked(getProjectsPage).mockResolvedValueOnce(fixtures.projectsPage([], {
      pagination: { page: 2, limit: 50, total: 85, hasNextPage: false },
    }));
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText("Page 2 · 85 projets")).toBeTruthy();
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
    expect(await screen.findByText("Page 1 · 0 projets")).toBeTruthy();
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

  it("keeps the search and filter toolbar stacked until enough width is available", async () => {
    render(<ProjectsPage />);
    await waitFor(() => expect(screen.queryByText("Chargement des projets...")).toBeNull());

    const search = screen.getByPlaceholderText("Rechercher des projets...");
    const searchContainer = search.parentElement.parentElement;
    const controls = search.parentElement.parentElement.parentElement;
    const toolbar = controls.parentElement;

    expect(controls.classList.contains("w-full")).toBe(true);
    expect(controls.classList.contains("xl:flex-row")).toBe(true);
    expect(controls.classList.contains("md:flex-row")).toBe(false);
    expect(toolbar.classList.contains("items-start")).toBe(true);
    expect(toolbar.classList.contains("2xl:flex-row")).toBe(true);
    expect(toolbar.classList.contains("2xl:flex-wrap")).toBe(true);
    expect(controls.classList.contains("2xl:basis-[50rem]")).toBe(true);
    expect(toolbar.classList.contains("xl:flex-row")).toBe(false);
    expect(searchContainer.classList.contains("md:min-w-[280px]")).toBe(true);
    expect(searchContainer.classList.contains("2xl:min-w-[240px]")).toBe(true);
    expect(searchContainer.classList.contains("md:flex-1")).toBe(true);
    expect(screen.getByRole("tablist", { name: "Vue des projets" })).toBeTruthy();
  });

  it("opens the requested BFF-backed project and highlights its task", async () => {
    const project = fixtures.projectListItem();
    const task = fixtures.projectTask();
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockResolvedValue(fixtures.projectDetails(project, [task]));
    window.history.replaceState({}, "", `/?source=dashboard&project=${project.id}&task=${task.id}`);

    const { container } = render(<ProjectsPage />);

    expect(await screen.findByRole("heading", { name: project.title, level: 2 })).toBeTruthy();
    expect(getProjectDetails).toHaveBeenCalledExactlyOnceWith(project.id);
    expect(container.querySelector(`[data-linked-task="${task.id}"]`)).toBeTruthy();
    expect(screen.getByText(task.title)).toBeTruthy();
    expect(screen.getByRole("dialog", { name: project.title })).toBeTruthy();
    await waitFor(() => {
      expect(document.activeElement).toBe(container.querySelector(`[data-linked-task="${task.id}"]`));
    });
  });

  it("keeps keyboard focus inside a named project dialog and returns it to the opener", async () => {
    const user = userEvent.setup();
    const project = fixtures.projectListItem();
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockResolvedValue(fixtures.projectDetails(project));
    render(<ProjectsPage />);

    const opener = await screen.findByRole("button", { name: `Ouvrir la fiche du projet ${project.title}` });
    await user.click(opener);
    const dialog = await screen.findByRole("dialog", { name: project.title });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(dialog);

    const focusable = Array.from(dialog.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])"))
      .filter((element) => element.tabIndex >= 0 && element.getAttribute("aria-hidden") !== "true");
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    expect(first).toBeTruthy();
    expect(last).toBeTruthy();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
    await user.tab();
    expect(document.activeElement).toBe(first);

    const results = await axe(dialog);
    expect(results.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: project.title })).toBeNull());
    expect(document.activeElement).toBe(opener);

    await user.click(opener);
    expect(await screen.findByRole("dialog", { name: project.title })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Fermer la fiche projet" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: project.title })).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("rejects an incomplete task link without requesting a project detail", async () => {
    window.history.replaceState({}, "", "/?task=task-1");
    render(<ProjectsPage />);

    expect(await screen.findByText("Lien de projet invalide.")).toBeTruthy();
    expect(getProjectDetails).not.toHaveBeenCalled();
  });

  it("keeps controls keyboard reachable and has no serious or critical axe violation", async () => {
    const user = userEvent.setup();
    render(<ProjectsPage />);
    await waitFor(() => expect(screen.queryByText("Chargement des projets...")).toBeNull());

    await user.tab();
    expect(document.activeElement?.matches("button, input, a")).toBe(true);
    expect(screen.getByRole("main")).toBeTruthy();

    const results = await axe(document.body);
    expect(results.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });
});
