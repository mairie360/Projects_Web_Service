import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectPage } from '@/components/ProjectsWorkspace/components/ProjectPage';
import { checkedOptions, toggleOption } from './units/multi-select';
import fixtures from "../support/bff-fixtures.cjs";

function props() {
  const page = fixtures.projectsPage();
  return {
    project: { ...fixtures.projectListItem(), dueDate: "2026-12-15" }, tasks: [],
    memberOptions: page.options.members, labelOptions: page.options.labels,
    statusOptions: page.filters.statuses, priorityOptions: page.filters.priorities,
    initialTab: "tasks", onClose: vi.fn(), onUpdateProject: vi.fn(), onAddTask: vi.fn(), onUpdateTask: vi.fn(),
    onUpdateTaskStatus: vi.fn(), onDeleteTask: vi.fn(), onCloseProject: vi.fn(),
  };
}

describe("Project edit modal confirmation (MAIR-846)", () => {
  it("keeps every field and inline error on refusal and same-project refresh, then closes only after a confirmed retry", async () => {
    const user = userEvent.setup();
    const values = props();
    values.onUpdateProject.mockRejectedValueOnce(new Error("Projet refusé")).mockResolvedValueOnce(undefined);
    const { rerender } = render(<ProjectPage {...values} />);
    await user.click(screen.getByRole("button", { name: "Modifier", exact: true }));
    const form = within(screen.getByRole("form", { name: "Modifier le projet" }));
    await user.clear(form.getByLabelText(/^Titre/));
    await user.type(form.getByLabelText(/^Titre/), "Projet à conserver");
    await user.clear(form.getByLabelText(/^Description/));
    await user.type(form.getByLabelText(/^Description/), "Description conservée");
    await user.selectOptions(form.getByLabelText("Statut", { exact: true }), "review");
    await user.selectOptions(form.getByLabelText("Priorité", { exact: true }), "low");
    await user.selectOptions(form.getByLabelText("Responsable", { exact: true }), "user-1");
    await toggleOption(user, form, 'Équipe', 'Admin Mairie');
    await toggleOption(user, form, 'Étiquettes', 'voirie');
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
      expect(form.getByLabelText("Responsable", { exact: true }).value).toBe("user-1");
      expect(checkedOptions(form, 'Équipe')).toHaveLength(3);
      expect(checkedOptions(form, 'Étiquettes')).not.toContain('voirie');
      expect(form.getByLabelText(/^Échéance/).value).toBe("2026-11-17");
    };
    assertDraft();
    expect(draft.assignees).toEqual(["user-2", "user-3", "user-1"]);
    expect(draft.labels).toEqual(["énergie"]);
    rerender(<ProjectPage {...values} project={{ ...values.project, title: "Titre officiel rafraîchi" }} />);
    assertDraft();
    expect(checkedOptions(form, 'Équipe')).toContain('Admin Mairie');
    await user.click(form.getByLabelText(/^Titre/));
    expect(form.getByRole("alert").textContent).toBe("Projet refusé");
    await user.click(form.getByRole("button", { name: "Enregistrer", exact: true }));
    expect(screen.queryByRole("form", { name: "Modifier le projet" })).toBeNull();
    // MAIR-846: the edit modal closes and gives the focus back to the page.
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).closest("section").contains(document.activeElement)).toBe(true);
    expect(values.onUpdateProject).toHaveBeenCalledTimes(2);
    expect(values.onUpdateProject.mock.calls[1][1]).toEqual(draft);
  });

  it.each(["header", "form"])("guards pending saves and restores official values on explicit %s cancellation", async (cancel) => {
    const user = userEvent.setup();
    const values = props();
    let reject;
    values.onUpdateProject.mockReturnValue(new Promise((_, fail) => { reject = fail; }));
    render(<ProjectPage {...values} />);
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
    expect(within(form).getByRole("button", { name: "Annuler", exact: true }).matches(":disabled")).toBe(true);
    // The modal close button does not close a pending save either.
    await user.click(screen.getByRole("button", { name: "Fermer la fenêtre" }));
    expect(screen.getByRole("form", { name: "Modifier le projet" })).toBe(form);
    expect(screen.getByRole("button", { name: "Projets" }).disabled).toBe(true);
    // No quick add while the project save runs (MAIR-1134: the lib KanbanColumn hides its « + »).
    expect(screen.queryByRole("button", { name: "Ajouter dans À faire", exact: true })).toBeNull();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(values.onClose).not.toHaveBeenCalled();
    expect(within(form).getByRole("status").textContent).toMatch(/Enregistrement/);
    await act(async () => reject(new Error("Refus")));
    expect(await within(form).findByRole("alert")).toHaveProperty("textContent", "Refus");
    await user.click(cancel === "header"
      ? screen.getByRole("button", { name: "Fermer la fenêtre" })
      : within(form).getByRole("button", { name: "Annuler", exact: true }));
    expect(screen.queryByRole("form", { name: "Modifier le projet" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Modifier", exact: true }));
    expect(within(screen.getByRole("form", { name: "Modifier le projet" })).getByLabelText(/^Titre/).value).toBe(values.project.title);
    expect(within(screen.getByRole("form", { name: "Modifier le projet" })).queryByRole("alert")).toBeNull();
  });

  it("does not expose editing when the existing permission denies it", () => {
    const values = props();
    render(<ProjectPage {...values} project={{ ...values.project, permissions: { ...values.project.permissions, canEdit: false } }} />);
    expect(screen.queryByRole("button", { name: "Modifier", exact: true })).toBeNull();
    expect(values.onUpdateProject).not.toHaveBeenCalled();
  });
});
