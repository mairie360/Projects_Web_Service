import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectDetailModal } from "@/components/project/ProjectDetailModal";
import { TaskComposer } from "@/components/project-card/TaskComposer";
import { NewTaskReceiptVerificationRequiredError } from "@/lib/projectTaskVerification";
import fixtures from "../support/bff-fixtures.cjs";

function props() {
  const page = fixtures.projectsPage();
  return {
    project: { ...fixtures.projectListItem(), dueDate: "2026-12-15" },
    tasks: [{ ...fixtures.projectTask(), dueDate: "2026-10-01" }],
    memberOptions: page.options.members,
    defaultTaskAssigneeId: "user-3",
    labelOptions: page.options.labels,
    statusOptions: page.filters.statuses,
    priorityOptions: page.filters.priorities,
    onClose: vi.fn(), onUpdateProject: vi.fn(), onAddTask: vi.fn(),
    onUpdateTask: vi.fn(), onUpdateTaskStatus: vi.fn(), onDeleteTask: vi.fn(), onCloseProject: vi.fn(),
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe("Project task save confirmation", () => {
  it('retains a card draft on uncertain acceptance and disables both native and programmatic submissions after inspection', async () => {
    const user = userEvent.setup(), values = props();
    const onInspect = vi.fn(), onPreserveDraft = vi.fn();
    values.onAddTask.mockRejectedValue(new NewTaskReceiptVerificationRequiredError());
    const { rerender } = render(<TaskComposer {...values} onInspect={onInspect} onPreserveDraft={onPreserveDraft} />);
    await user.click(screen.getByRole('button', { name: 'Ajouter une tâche' }));
    const input = screen.getByLabelText('Titre de la tâche', { exact: true });
    await user.type(input, 'Brouillon carte accepté');
    await user.click(screen.getByRole('button', { name: 'Ajouter', exact: true }));
    const state = { uncertainTitle: 'Brouillon carte accepté', draft: { title: 'Brouillon carte accepté', status: 'review', priority: 'low', assignees: ['user-1'], labels: ['voirie'], dueDate: '2026-11-17' } };
    rerender(<TaskComposer {...values} creationState={state} onInspect={onInspect} onPreserveDraft={onPreserveDraft} />);
    expect(screen.getByRole('button', { name: 'Ajouter', exact: true }).disabled).toBe(true);
    expect(input.value).toBe('Brouillon carte accepté');
    expect(document.activeElement.textContent).toMatch(/Création de tâche non vérifiée/);
    await user.type(input, ' gardé');
    expect(onPreserveDraft).toHaveBeenLastCalledWith(values.project.id, { title: 'Brouillon carte accepté gardé' });
    fireEvent.submit(input.closest('form'));
    expect(values.onAddTask).toHaveBeenCalledOnce();
    const inspect = screen.getByRole('button', { name: 'Inspecter les tâches du projet' });
    inspect.focus(); await user.keyboard('{Enter}');
    expect(onInspect).toHaveBeenCalledWith(values.project.id);
    await user.click(screen.getByRole('button', { name: 'Annuler', exact: true }));
    await user.click(screen.getByRole('button', { name: 'Création à inspecter', exact: true }));
    expect(screen.getByLabelText('Titre de la tâche', { exact: true }).value).toBe('Brouillon carte accepté gardé');
    expect(values.onAddTask).toHaveBeenCalledOnce();
  });
  it.each(["create", "edit"])("preserves every detail %s field and edit mode on refusal, then resets only after confirmed retry", async (mode) => {
    const user = userEvent.setup();
    const values = props();
    const save = mode === "edit" ? values.onUpdateTask : values.onAddTask;
    save.mockRejectedValueOnce(new Error("Enregistrement refusé")).mockResolvedValueOnce(undefined);
    const { rerender } = render(<ProjectDetailModal {...values} />);
    const dialog = within(screen.getByRole("dialog"));
    if (mode === "edit") await user.click(dialog.getAllByRole("button", { name: "Modifier", exact: true }).at(-1));
    const title = dialog.getByPlaceholderText("Ajouter une tâche...");
    await user.clear(title);
    await user.type(title, "Brouillon conservé");
    await user.selectOptions(dialog.getByLabelText("Statut", { exact: true }), "review");
    await user.selectOptions(dialog.getByLabelText("Priorité", { exact: true }), "low");
    fireEvent.change(dialog.getByLabelText("Échéance", { exact: true }), { target: { value: "2026-11-17" } });
    await user.click(dialog.getByLabelText("Assignés", { exact: true }));
    await user.click(dialog.getByRole("option", { name: "Admin Mairie" }));
    await user.click(dialog.getByLabelText("Étiquettes", { exact: true }));
    if (mode === "create") await user.click(dialog.getByRole("option", { name: "voirie" }));
    await user.click(title);
    const before = {
      title: title.value,
      assignees: dialog.getByLabelText("Assignés", { exact: true }).textContent,
      labels: dialog.getByLabelText("Étiquettes", { exact: true }).textContent,
    };
    await user.click(dialog.getByRole("button", { name: mode === "edit" ? "Enregistrer la tâche" : "Ajouter la tâche", exact: true }));
    expect(await dialog.findByRole("alert")).toHaveProperty("textContent", "Enregistrement refusé");
    expect(title.value).toBe(before.title);
    expect(dialog.getByLabelText("Statut", { exact: true }).value).toBe("review");
    expect(dialog.getByLabelText("Priorité", { exact: true }).value).toBe("low");
    expect(dialog.getByLabelText("Échéance", { exact: true }).value).toBe("2026-11-17");
    expect(dialog.getByLabelText("Assignés", { exact: true }).textContent).toBe(before.assignees);
    expect(dialog.getByLabelText("Étiquettes", { exact: true }).textContent).toBe(before.labels);
    if (mode === "edit") expect(dialog.getByRole("button", { name: "Enregistrer la tâche", exact: true })).toBeTruthy();
    rerender(<ProjectDetailModal {...values} project={{ ...values.project, priority: "high" }} tasks={values.tasks.map(task => ({ ...task }))} />);
    expect(title.value).toBe(before.title);
    expect(dialog.getByLabelText("Priorité", { exact: true }).value).toBe("low");
    await user.click(dialog.getByRole("button", { name: mode === "edit" ? "Enregistrer la tâche" : "Ajouter la tâche", exact: true }));
    await waitFor(() => expect(title.value).toBe(""));
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]).toEqual(save.mock.calls[0]);
    const draft = save.mock.calls[1].at(-1);
    expect(draft).toMatchObject({ title: before.title, status: "review", priority: "low", dueDate: "2026-11-17", labels: ["voirie"] });
    expect(draft.responsible.id).toBe("user-3");
    expect(draft.assignees.map(person => person.id)).toEqual(mode === "edit" ? ["user-3", "user-2", "user-1"] : ["user-3", "user-1"]);
    expect(draft.assignees.map(person => person.id)).toContain("user-1");
    expect(dialog.queryByRole("alert")).toBeNull();
    expect(dialog.getByRole("button", { name: "Ajouter la tâche", exact: true })).toBeTruthy();
  });

  it("locks a pending edit including cancel, close, Escape, inputs and duplicate submissions", async () => {
    const user = userEvent.setup();
    const values = props();
    const pending = deferred();
    values.onUpdateTask.mockReturnValue(pending.promise);
    render(<ProjectDetailModal {...values} />);
    const dialog = screen.getByRole("dialog");
    const scope = within(dialog);
    await user.click(scope.getAllByRole("button", { name: "Modifier", exact: true }).at(-1));
    const title = scope.getByPlaceholderText("Ajouter une tâche...");
    fireEvent.submit(title.closest("form"));
    fireEvent.submit(title.closest("form"));
    expect(values.onUpdateTask).toHaveBeenCalledOnce();
    expect(title.matches(":disabled")).toBe(true);
    expect(scope.getByRole("button", { name: "Annuler", exact: true }).matches(":disabled")).toBe(true);
    expect(scope.getByRole("button", { name: "Fermer la fiche projet" }).disabled).toBe(true);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(values.onClose).not.toHaveBeenCalled();
    expect(scope.getByRole("status").textContent).toMatch(/Enregistrement/);
    await act(async () => pending.reject(new Error("Refus temporaire")));
    expect(await scope.findByRole("alert")).toHaveProperty("textContent", "Refus temporaire");
    expect(title.matches(":disabled")).toBe(false);
    await user.click(scope.getByRole("button", { name: "Annuler", exact: true }));
    expect(title.value).toBe("");
    expect(scope.getByLabelText("Statut", { exact: true }).value).toBe(values.project.status);
    expect(scope.queryByRole("alert")).toBeNull();
  });

  it("preserves the inline card draft on refusal and same-project refresh, then prevents duplicate retry while pending", async () => {
    const user = userEvent.setup();
    const values = props();
    const pending = deferred();
    values.onAddTask.mockRejectedValueOnce(new Error("Carte refusée")).mockReturnValueOnce(pending.promise);
    const { rerender } = render(<TaskComposer {...values} />);
    await user.click(screen.getByRole("button", { name: "Ajouter une tâche" }));
    const title = screen.getByPlaceholderText("Ajouter une tâche...");
    await user.type(title, "Tâche carte à conserver");
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "review" } });
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "low" } });
    fireEvent.change(title.closest("form").querySelector('input[type="date"]'), { target: { value: "2026-11-17" } });
    await user.click(screen.getByRole("button", { name: "Étiquettes", exact: true }));
    await user.click(screen.getByRole("option", { name: "voirie" }));
    await user.click(screen.getByRole("button", { name: "Ajouter", exact: true }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Carte refusée");
    rerender(<TaskComposer {...values} project={{ ...values.project, responsible: { ...values.project.responsible }, status: "done", priority: "high", dueDate: "2027-01-01" }} />);
    expect(title.value).toBe("Tâche carte à conserver");
    expect(screen.getAllByRole("combobox").map(x => x.value)).toEqual(["review", "low"]);
    fireEvent.submit(title.closest("form"));
    fireEvent.submit(title.closest("form"));
    expect(values.onAddTask).toHaveBeenCalledTimes(2);
    expect(values.onAddTask.mock.calls[1][1]).toEqual(values.onAddTask.mock.calls[0][1]);
    expect(title.matches(":disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Annuler", exact: true }).matches(":disabled")).toBe(true);
    await act(async () => pending.resolve());
    expect(screen.queryByPlaceholderText("Ajouter une tâche...")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Ajouter une tâche" }));
    expect(screen.getByPlaceholderText("Ajouter une tâche...").value).toBe("");
    expect(screen.getAllByRole("combobox").map(x => x.value)).toEqual(["done", "high"]);
  });
});

it('requires an explicit assignee when the authenticated agent is unavailable, without substituting the project owner', async () => {
  const user=userEvent.setup();const values={ ...props(),defaultTaskAssigneeId:null };
  render(<ProjectDetailModal {...values} />);
  const scope=within(screen.getByRole('dialog'));const title=scope.getByPlaceholderText('Ajouter une tâche...');
  await user.type(title,'Tâche sans identité supposée');
  fireEvent.submit(title.closest('form'));
  expect(await scope.findByRole('alert')).toHaveProperty('textContent','Choisissez au moins un agent assigné à cette tâche.');
  expect(values.onAddTask).not.toHaveBeenCalled();
  await user.click(scope.getByLabelText('Assignés',{exact:true}));await user.click(scope.getByRole('option',{name:'Admin Mairie'}));await user.click(title);
  fireEvent.submit(title.closest('form'));
  await waitFor(()=>expect(values.onAddTask).toHaveBeenCalledOnce());
  expect(values.onAddTask.mock.calls[0].at(-1).responsible.id).toBe('user-1');
});

it('prefills the fresh selectable identity, rereads after a save and does not overwrite a touched draft', async () => {
  const user = userEvent.setup(), values = props(), first = deferred(), second = deferred();
  const read = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  render(<ProjectDetailModal {...values} readCurrentTaskAssignee={read} />);
  const dialog = within(screen.getByRole('dialog')), title = dialog.getByLabelText('Titre de la tâche', { exact:true });
  const assignees = dialog.getByLabelText('Assignés', {exact:true});
  expect(assignees.textContent).toContain('Choisir un ou plusieurs assignés');
  await act(async () => first.resolve('user-1'));
  expect(dialog.getByRole('button',{name:'Retirer Admin Mairie'})).toBeTruthy();
  await user.type(title, 'Tâche confirmée');
  await user.click(dialog.getByRole('button', {name:'Ajouter la tâche',exact:true}));
  await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  expect(values.onAddTask.mock.calls[0][1].responsible.id).toBe('user-1');
  await user.type(title, 'Brouillon saisi avant la réponse');
  await user.click(assignees); await user.click(dialog.getByRole('option',{name:'Marie Durand',exact:true})); await user.click(title);
  await act(async () => second.resolve('user-1'));
  expect(read.mock.calls[1][0].aborted).toBe(true);
  expect(dialog.getByRole('button',{name:'Retirer Marie Durand'})).toBeTruthy();
  expect(dialog.queryByRole('button',{name:'Retirer Admin Mairie'})).toBeNull();
  expect(title.value).toBe('Brouillon saisi avant la réponse');
});

it('aborts a closed detail and reads the account again on reopening', async () => {
  const values=props(), old=deferred(), fresh=deferred();
  const read=vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
  const view=render(<ProjectDetailModal {...values} readCurrentTaskAssignee={read} />);
  view.unmount(); expect(read.mock.calls[0][0].aborted).toBe(true);
  render(<ProjectDetailModal {...values} readCurrentTaskAssignee={read} />);
  await act(async()=>old.resolve('user-1'));
  expect(screen.getByLabelText('Assignés',{exact:true}).textContent).toContain('Choisir un ou plusieurs assignés');
  await act(async()=>fresh.resolve('user-3'));
  expect(screen.getByRole('button',{name:'Retirer Marie Durand'})).toBeTruthy();
});

it('preserves a restored uncertain creation and existing task editing while reading new defaults', async () => {
  const user=userEvent.setup(), values=props(), read=vi.fn().mockResolvedValue('user-1');
  const state={uncertainTitle:'Brouillon conservé',draft:{title:'Brouillon conservé',status:'review',priority:'low',assignees:['user-3'],labels:[],dueDate:'2026-11-17'}};
  render(<ProjectDetailModal {...values} taskCreationState={state} readCurrentTaskAssignee={read} />);
  expect(read).not.toHaveBeenCalled();
  const scope=within(screen.getByRole('dialog'));
  await user.click(scope.getAllByRole('button',{name:'Modifier',exact:true}).at(-1));
  expect(scope.getByLabelText('Titre de la tâche',{exact:true}).value).toBe(values.tasks[0].title);
  expect(read).not.toHaveBeenCalled();
  await user.click(scope.getByRole('button',{name:'Annuler',exact:true}));
  expect(scope.getByLabelText('Titre de la tâche',{exact:true}).value).toBe('Brouillon conservé');
  expect(scope.getByRole('button',{name:'Retirer Marie Durand'})).toBeTruthy();
  expect(read).not.toHaveBeenCalled();
});

it.each([null, 'refused'])('keeps an unavailable identity manual (%s)', async result => {
  const user=userEvent.setup(), values=props();
  const read=result==='refused'?vi.fn().mockRejectedValue(new Error('Unavailable')):vi.fn().mockResolvedValue(null);
  render(<ProjectDetailModal {...values} readCurrentTaskAssignee={read} />);
  const title=screen.getByLabelText('Titre de la tâche',{exact:true});
  await user.type(title,'Affectation explicite requise');fireEvent.submit(title.closest('form'));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Choisissez au moins un agent assigné à cette tâche.');
  expect(values.onAddTask).not.toHaveBeenCalled();
});
