import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectDetailModal } from '@/components/ProjectsWorkspace/components/ProjectDetailModal';
import { NewTaskReceiptVerificationRequiredError } from "@/lib/projectTaskVerification";
import { checkedOptions, toggleOption } from './units/multi-select';
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
    await toggleOption(user, dialog, 'Assignés', 'Admin Mairie');
    if (mode === "create") await toggleOption(user, dialog, 'Étiquettes', 'voirie');
    await user.click(title);
    const before = {
      title: title.value,
      assignees: checkedOptions(dialog, 'Assignés'),
      labels: checkedOptions(dialog, 'Étiquettes'),
    };
    await user.click(dialog.getByRole("button", { name: mode === "edit" ? "Enregistrer la tâche" : "Ajouter la tâche", exact: true }));
    expect(await dialog.findByRole("alert")).toHaveProperty("textContent", "Enregistrement refusé");
    expect(title.value).toBe(before.title);
    expect(dialog.getByLabelText("Statut", { exact: true }).value).toBe("review");
    expect(dialog.getByLabelText("Priorité", { exact: true }).value).toBe("low");
    expect(dialog.getByLabelText("Échéance", { exact: true }).value).toBe("2026-11-17");
    expect(checkedOptions(dialog, 'Assignés')).toEqual(before.assignees);
    expect(checkedOptions(dialog, 'Étiquettes')).toEqual(before.labels);
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

});

it('requires an explicit assignee when the authenticated agent is unavailable, without substituting the project owner', async () => {
  const user=userEvent.setup();const values={ ...props(),defaultTaskAssigneeId:null };
  render(<ProjectDetailModal {...values} />);
  const scope=within(screen.getByRole('dialog'));const title=scope.getByPlaceholderText('Ajouter une tâche...');
  await user.type(title,'Tâche sans identité supposée');
  fireEvent.submit(title.closest('form'));
  expect(await scope.findByRole('alert')).toHaveProperty('textContent','Choisissez au moins un agent assigné à cette tâche.');
  expect(values.onAddTask).not.toHaveBeenCalled();
  await toggleOption(user, scope, 'Assignés', 'Admin Mairie');await user.click(title);
  fireEvent.submit(title.closest('form'));
  await waitFor(()=>expect(values.onAddTask).toHaveBeenCalledOnce());
  expect(values.onAddTask.mock.calls[0].at(-1).responsible.id).toBe('user-1');
});

it('prefills the fresh selectable identity, rereads after a save and does not overwrite a touched draft', async () => {
  const user = userEvent.setup(), values = props(), first = deferred(), second = deferred();
  const read = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  render(<ProjectDetailModal {...values} readCurrentTaskAssignee={read} />);
  const dialog = within(screen.getByRole('dialog')), title = dialog.getByLabelText('Titre de la tâche', { exact:true });
  expect(checkedOptions(dialog, 'Assignés')).toEqual([]);
  await act(async () => first.resolve('user-1'));
  expect(dialog.getByRole('button',{name:'Retirer Admin Mairie'})).toBeTruthy();
  await user.type(title, 'Tâche confirmée');
  await user.click(dialog.getByRole('button', {name:'Ajouter la tâche',exact:true}));
  await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  expect(values.onAddTask.mock.calls[0][1].responsible.id).toBe('user-1');
  await user.type(title, 'Brouillon saisi avant la réponse');
  await toggleOption(user, dialog, 'Assignés', 'Marie Durand'); await user.click(title);
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
  expect(checkedOptions(screen, 'Assignés')).toEqual([]);
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
