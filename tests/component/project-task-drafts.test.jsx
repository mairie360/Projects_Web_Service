import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectPage } from '@/components/ProjectsWorkspace/components/ProjectPage';
import { NewTaskReceiptVerificationRequiredError } from "@/lib/projectTaskVerification";
import { checkedOptions, toggleOption } from './units/multi-select';
import { chooseTaskAssignee, nextTaskStep, openNewTaskSheet, openTaskSheet, pageSection, queryTaskSheet, taskSheet } from './units/project-page';

const radio = (scope, group, name) => within(scope.getByRole('group', { name: new RegExp(`^${group}`) })).getByRole('radio', { name: new RegExp(`^${name}`) });
const checkedRadio = (scope, group) => within(scope.getByRole('group', { name: new RegExp(`^${group}`), hidden: true })).getAllByRole('radio', { hidden: true }).find((input) => input.checked)?.value;
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
    initialTab: 'tasks', onClose: vi.fn(), onUpdateProject: vi.fn(), onAddTask: vi.fn(),
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
  it.each(["create", "edit"])("preserves every %s field on refusal, then closes only after confirmed retry (MAIR-859, MAIR-1137)", async (mode) => {
    const user = userEvent.setup();
    const values = props();
    const save = mode === "edit" ? values.onUpdateTask : values.onAddTask;
    save.mockRejectedValueOnce(new Error("Enregistrement refusé")).mockResolvedValueOnce(undefined);
    const { rerender } = render(<ProjectPage {...values} />);
    const sheet = mode === "edit" ? await openTaskSheet(user, values.tasks[0].title) : await openNewTaskSheet(user);
    const title = sheet.getByLabelText(/^Titre/);
    await user.clear(title);
    await user.type(title, "Brouillon conservé");
    fireEvent.change(sheet.getByLabelText("Échéance", { exact: true }), { target: { value: "2026-11-17" } });
    if (mode === "create") {
      await toggleOption(user, sheet, 'Étiquettes', 'voirie');
      await nextTaskStep(user, sheet);
    }
    await chooseTaskAssignee(user, 'Admin Mairie', sheet);
    await user.click(radio(sheet, 'Priorité', 'Basse'));
    await user.click(radio(sheet, mode === "edit" ? 'État' : 'Colonne de départ', 'En cours'));
    if (mode === "create") await nextTaskStep(user, sheet);
    const submitName = mode === "edit" ? /^Enregistrer \(\d+\)$/ : "Ajouter la tâche";
    await user.click(sheet.getByRole("button", { name: submitName }));
    expect(await sheet.findByRole("alert")).toHaveProperty("textContent", "Enregistrement refusé");
    expect(title.value).toBe("Brouillon conservé");
    expect(checkedRadio(sheet, 'Priorité')).toBe("low");
    expect(sheet.getByLabelText("Échéance", { exact: true }).value).toBe("2026-11-17");
    expect(checkedRadio(sheet, 'Assignée à')).toBe("user-1");
    rerender(<ProjectPage {...values} project={{ ...values.project, priority: "high" }} tasks={values.tasks.map(task => ({ ...task }))} />);
    expect(taskSheet().getByLabelText(/^Titre/).value).toBe("Brouillon conservé");
    expect(checkedRadio(taskSheet(), 'Priorité')).toBe("low");
    await user.click(taskSheet().getByRole("button", { name: submitName }));
    await waitFor(() => expect(queryTaskSheet()).toBeNull());
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]).toEqual(save.mock.calls[0]);
    const draft = save.mock.calls[1].at(-1);
    expect(draft).toMatchObject({ title: "Brouillon conservé", status: "in-progress", priority: "low", dueDate: "2026-11-17", labels: ["voirie"] });
    // MAIR-1137 (C12): the « Assignée à » cards name one agent.
    expect(draft.responsible.id).toBe("user-1");
    expect(draft.assignees.map(person => person.id)).toEqual(["user-1"]);
    // The next creation starts empty, at its first step.
    const next = await openNewTaskSheet(user);
    expect(next.getByLabelText(/^Titre/).value).toBe("");
    expect(next.queryByRole("alert")).toBeNull();
  });

  it("locks a pending edit including cancel, close, Escape, inputs and duplicate submissions", async () => {
    const user = userEvent.setup();
    const values = props();
    const pending = deferred();
    values.onUpdateTask.mockReturnValue(pending.promise);
    render(<ProjectPage {...values} />);
    const scope = await openTaskSheet(user, values.tasks[0].title);
    const title = scope.getByLabelText(/^Titre/);
    fireEvent.submit(title.closest("form"));
    fireEvent.submit(title.closest("form"));
    expect(values.onUpdateTask).toHaveBeenCalledOnce();
    expect(title.matches(":disabled")).toBe(true);
    expect(scope.getByRole("button", { name: "Annuler", exact: true }).matches(":disabled")).toBe(true);
    expect(within(pageSection()).getByRole("button", { name: "Projets" }).disabled).toBe(true);
    fireEvent.keyDown(title, { key: "Escape" });
    expect(queryTaskSheet()).not.toBeNull();
    expect(values.onClose).not.toHaveBeenCalled();
    expect(scope.getByRole("status").textContent).toMatch(/Enregistrement/);
    await act(async () => pending.reject(new Error("Refus temporaire")));
    expect(await scope.findByRole("alert")).toHaveProperty("textContent", "Refus temporaire");
    expect(title.matches(":disabled")).toBe(false);
    await user.click(scope.getByRole("button", { name: "Annuler", exact: true }));
    expect(queryTaskSheet()).toBeNull();
    const next = await openNewTaskSheet(user);
    expect(next.getByLabelText(/^Titre/).value).toBe("");
    expect(next.queryByRole("alert")).toBeNull();
  });

  it("refuses an empty title under the field before any write (MAIR-859 C5)", async () => {
    const user = userEvent.setup();
    const values = props();
    render(<ProjectPage {...values} />);
    const sheet = await openNewTaskSheet(user);
    // MAIR-1137 (C12): « Suivant » checks the title of the first step.
    await nextTaskStep(user, sheet);
    expect(sheet.getByText("Donnez un titre à la tâche")).toBeTruthy();
    expect(sheet.getByLabelText(/^Titre/).getAttribute("aria-invalid")).toBe("true");
    expect(values.onAddTask).not.toHaveBeenCalled();
    await user.type(sheet.getByLabelText(/^Titre/), "Consulter les riverains");
    expect(sheet.queryByText("Donnez un titre à la tâche")).toBeNull();
  });
});

it('requires an explicit assignee when the authenticated agent is unavailable, without substituting the project owner', async () => {
  const user=userEvent.setup();const values={ ...props(),defaultTaskAssigneeId:null };
  render(<ProjectPage {...values} />);
  const scope=await openNewTaskSheet(user);const title=scope.getByLabelText(/^Titre/);
  await user.type(title,'Tâche sans identité supposée');
  fireEvent.submit(title.closest('form'));
  // MAIR-1137: « Attribution » keeps the agent there until an agent is chosen.
  fireEvent.submit(title.closest('form'));
  expect(await scope.findByText('Choisissez au moins un agent assigné à cette tâche.')).toBeTruthy();
  expect(values.onAddTask).not.toHaveBeenCalled();
  await chooseTaskAssignee(user, 'Admin Mairie', scope);
  fireEvent.submit(title.closest('form'));
  fireEvent.submit(title.closest('form'));
  await waitFor(()=>expect(values.onAddTask).toHaveBeenCalledOnce());
  expect(values.onAddTask.mock.calls[0].at(-1).responsible.id).toBe('user-1');
});

it('prefills the fresh selectable identity, rereads after a save and does not overwrite a touched draft', async () => {
  const user = userEvent.setup(), values = props(), first = deferred(), second = deferred();
  const read = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  render(<ProjectPage {...values} readCurrentTaskAssignee={read} />);
  let sheet = await openNewTaskSheet(user);
  expect(checkedRadio(sheet, 'Assignée à')).toBeUndefined();
  await act(async () => first.resolve('user-1'));
  expect(checkedRadio(sheet, 'Assignée à')).toBe('user-1');
  await user.type(sheet.getByLabelText(/^Titre/), 'Tâche confirmée');
  await nextTaskStep(user, sheet); await nextTaskStep(user, sheet);
  await user.click(sheet.getByRole('button', {name:'Ajouter la tâche',exact:true}));
  await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  expect(values.onAddTask.mock.calls[0][1].responsible.id).toBe('user-1');
  sheet = await openNewTaskSheet(user);
  const title = sheet.getByLabelText(/^Titre/);
  await user.type(title, 'Brouillon saisi avant la réponse');
  await nextTaskStep(user, sheet);
  await chooseTaskAssignee(user, 'Marie Durand', sheet);
  await act(async () => second.resolve('user-1'));
  expect(read.mock.calls[1][0].aborted).toBe(true);
  expect(checkedRadio(sheet, 'Assignée à')).toBe('user-3');
  expect(title.value).toBe('Brouillon saisi avant la réponse');
});

it('aborts a closed detail and reads the account again on reopening', async () => {
  const user=userEvent.setup(), values=props(), old=deferred(), fresh=deferred();
  const read=vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
  const view=render(<ProjectPage {...values} readCurrentTaskAssignee={read} />);
  view.unmount(); expect(read.mock.calls[0][0].aborted).toBe(true);
  render(<ProjectPage {...values} readCurrentTaskAssignee={read} />);
  await act(async()=>old.resolve('user-1'));
  const sheet = await openNewTaskSheet(user);
  expect(checkedRadio(sheet, 'Assignée à')).toBeUndefined();
  await act(async()=>fresh.resolve('user-3'));
  expect(checkedRadio(sheet, 'Assignée à')).toBe('user-3');
});

it('preserves a restored uncertain creation and existing task editing while reading new defaults', async () => {
  const user=userEvent.setup(), values=props(), read=vi.fn().mockResolvedValue('user-1');
  const state={uncertainTitle:'Brouillon conservé',draft:{title:'Brouillon conservé',status:'in-progress',priority:'low',assignees:['user-3'],labels:[],dueDate:'2026-11-17'}};
  render(<ProjectPage {...values} taskCreationState={state} readCurrentTaskAssignee={read} />);
  expect(read).not.toHaveBeenCalled();
  let sheet = await openTaskSheet(user, values.tasks[0].title);
  expect(sheet.getByLabelText(/^Titre/).value).toBe(values.tasks[0].title);
  expect(read).not.toHaveBeenCalled();
  await user.click(sheet.getByRole('button',{name:'Annuler',exact:true}));
  sheet = await openNewTaskSheet(user);
  expect(sheet.getByLabelText(/^Titre/).value).toBe('Brouillon conservé');
  expect(checkedRadio(sheet, 'Assignée à')).toBe('user-3');
  expect(read).not.toHaveBeenCalled();
});

it.each([null, 'refused'])('keeps an unavailable identity manual (%s)', async result => {
  const user=userEvent.setup(), values=props();
  const read=result==='refused'?vi.fn().mockRejectedValue(new Error('Unavailable')):vi.fn().mockResolvedValue(null);
  render(<ProjectPage {...values} readCurrentTaskAssignee={read} />);
  const sheet = await openNewTaskSheet(user);
  const title=sheet.getByLabelText(/^Titre/);
  await user.type(title,'Affectation explicite requise');fireEvent.submit(title.closest('form'));fireEvent.submit(title.closest('form'));
  expect(await sheet.findByText('Choisissez au moins un agent assigné à cette tâche.')).toBeTruthy();
  expect(values.onAddTask).not.toHaveBeenCalled();
});
