import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectDetailModal } from "@/components/project/ProjectDetailModal";
import fixtures from "../support/bff-fixtures.cjs";

function props() {
  const page = fixtures.projectsPage();
  return {
    project: { ...fixtures.projectListItem(), dueDate: "2026-12-15" }, tasks: [],
    memberOptions: page.options.members, labelOptions: page.options.labels,
    statusOptions: page.filters.statuses, priorityOptions: page.filters.priorities,
    onClose: vi.fn(), onUpdateProject: vi.fn(), onAddTask: vi.fn(), onUpdateTask: vi.fn(),
    onUpdateTaskStatus: vi.fn(), onDeleteTask: vi.fn(), onCloseProject: vi.fn(),
  };
}

describe("Inline project edit confirmation", () => {
  it("keeps every field and inline error on refusal and same-project refresh, then closes only after a confirmed retry", async () => {
    const user = userEvent.setup();
    const values = props();
    values.onUpdateProject.mockRejectedValueOnce(new Error("Projet refusé")).mockResolvedValueOnce(undefined);
    const { rerender } = render(<ProjectDetailModal {...values} />);
    await user.click(screen.getByRole("button", { name: "Modifier", exact: true }));
    const form = within(screen.getByRole("form", { name: "Modifier le projet" }));
    await user.clear(form.getByLabelText(/^Titre/));
    await user.type(form.getByLabelText(/^Titre/), "Projet à conserver");
    await user.clear(form.getByLabelText(/^Description/));
    await user.type(form.getByLabelText(/^Description/), "Description conservée");
    await user.selectOptions(form.getByLabelText("Statut", { exact: true }), "review");
    await user.selectOptions(form.getByLabelText("Priorité", { exact: true }), "low");
    await user.selectOptions(form.getByLabelText("Assigné principal", { exact: true }), "1");
    await user.click(form.getByLabelText("Assignés", { exact: true }));
    await user.click(within(form.getByRole("listbox")).getByRole("option", { name: "Admin Mairie" }));
    await user.click(form.getByLabelText("Étiquettes", { exact: true }));
    await user.click(form.getByRole("option", { name: "voirie" }));
    await user.click(form.getByLabelText(/^Titre/));
    fireEvent.change(form.getByLabelText(/^Échéance/), { target: { value: "2026-11-17" } });
    await user.click(form.getByRole("button", { name: "Enregistrer", exact: true }));
    expect(await form.findByRole("alert")).toHaveProperty("textContent", "Projet refusé");
    const draft = values.onUpdateProject.mock.calls[0][1];
    const assertDraft = () => {
      expect(form.getByLabelText(/^Titre/).value).toBe("Projet à conserver");
      expect(form.getByLabelText(/^Description/).value).toBe("Description conservée");
      expect(form.getByLabelText("Statut", { exact: true }).value).toBe("review");
      expect(form.getByLabelText("Priorité", { exact: true }).value).toBe("low");
      expect(form.getByLabelText("Assigné principal", { exact: true }).value).toBe("1");
      expect(form.getByLabelText("Assignés", { exact: true }).textContent).toBe("3 sélectionné(s)");
      expect(form.getByLabelText("Étiquettes", { exact: true }).textContent).not.toMatch(/voirie/);
      expect(form.getByLabelText(/^Échéance/).value).toBe("2026-11-17");
    };
    assertDraft();
    expect(draft.assignees).toEqual(["2", "3", "1"]);
    expect(draft.labels).toEqual(["énergie"]);
    rerender(<ProjectDetailModal {...values} project={{ ...values.project, title: "Titre officiel rafraîchi" }} />);
    assertDraft();
    await user.click(form.getByLabelText("Assignés", { exact: true }));
    expect(within(form.getByRole("listbox")).getByRole("option", { name: "Admin Mairie" }).getAttribute("aria-selected")).toBe("true");
    await user.click(form.getByLabelText(/^Titre/));
    expect(form.getByRole("alert").textContent).toBe("Projet refusé");
    await user.click(form.getByRole("button", { name: "Enregistrer", exact: true }));
    expect(screen.queryByRole("form", { name: "Modifier le projet" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
    expect(values.onUpdateProject).toHaveBeenCalledTimes(2);
    expect(values.onUpdateProject.mock.calls[1][1]).toEqual(draft);
  });

  it.each(["header", "form"])("guards pending saves and restores official values on explicit %s cancellation", async (cancel) => {
    const user = userEvent.setup();
    const values = props();
    let reject;
    values.onUpdateProject.mockReturnValue(new Promise((_, fail) => { reject = fail; }));
    render(<ProjectDetailModal {...values} />);
    await user.click(screen.getByRole("button", { name: "Modifier", exact: true }));
    const form = screen.getByRole("form", { name: "Modifier le projet" });
    const title = within(form).getByLabelText(/^Titre/);
    await user.clear(title);
    await user.type(title, "Non confirmé");
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(values.onUpdateProject).toHaveBeenCalledOnce();
    expect(form.getAttribute("aria-busy")).toBe("true");
    expect(title.matches(":disabled")).toBe(true);
    for (const button of screen.getAllByRole("button", { name: "Annuler", exact: true })) expect(button.matches(":disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Fermer la fiche projet" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Ajouter la tâche", exact: true }).matches(":disabled")).toBe(true);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(values.onClose).not.toHaveBeenCalled();
    expect(within(form).getByRole("status").textContent).toMatch(/Enregistrement/);
    await act(async () => reject(new Error("Refus")));
    expect(await within(form).findByRole("alert")).toHaveProperty("textContent", "Refus");
    const buttons = screen.getAllByRole("button", { name: "Annuler", exact: true });
    await user.click(buttons[cancel === "header" ? 0 : 1]);
    await user.click(screen.getByRole("button", { name: "Modifier", exact: true }));
    expect(within(screen.getByRole("form", { name: "Modifier le projet" })).getByLabelText(/^Titre/).value).toBe(values.project.title);
    expect(within(screen.getByRole("form", { name: "Modifier le projet" })).queryByRole("alert")).toBeNull();
  });

  it("does not expose editing when the existing permission denies it", () => {
    const values = props();
    render(<ProjectDetailModal {...values} project={{ ...values.project, permissions: { ...values.project.permissions, canEdit: false } }} />);
    expect(screen.queryByRole("button", { name: "Modifier", exact: true })).toBeNull();
    expect(values.onUpdateProject).not.toHaveBeenCalled();
  });
});
