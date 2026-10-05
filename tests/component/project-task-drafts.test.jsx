import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectDetailModal } from "@/components/project/ProjectDetailModal";
import { TaskComposer } from "@/components/project-card/TaskComposer";
import fixtures from "../support/bff-fixtures.cjs";

function props() {
  const page = fixtures.projectsPage();
  return {
    project: { ...fixtures.projectListItem(), dueDate: "2026-12-15" },
    tasks: [{ ...fixtures.projectTask(), dueDate: "2026-10-01" }],
    memberOptions: page.options.members,
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
    expect(draft.assignees.map(person => person.id)).toContain("1");
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
