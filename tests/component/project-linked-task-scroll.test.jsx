import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectPage } from '@/components/ProjectsWorkspace/components/ProjectPage';
import fixtures from "../support/bff-fixtures.cjs";

let scrollIntoView;
let previousScrollIntoView;

beforeEach(() => {
  scrollIntoView = vi.fn();
  previousScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView });
});

afterEach(() => {
  vi.restoreAllMocks();
  if (previousScrollIntoView) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", previousScrollIntoView);
  else delete HTMLElement.prototype.scrollIntoView;
});

function pageProps() {
  const page = fixtures.projectsPage();
  return {
    project: fixtures.projectListItem(),
    tasks: [fixtures.projectTask()],
    highlightTaskId: "task-1",
    memberOptions: page.options.members,
    labelOptions: page.options.labels,
    statusOptions: page.filters.statuses,
    priorityOptions: page.filters.priorities,
    onClose: vi.fn(),
    onUpdateProject: vi.fn(),
    onAddTask: vi.fn(),
    onUpdateTask: vi.fn(),
    onUpdateTaskStatus: vi.fn(),
    onDeleteTask: vi.fn(),
    onCloseProject: vi.fn(),
  };
}

// MAIR-846: the project is a page; a linked task (`?project=…&task=…`) opens « Tâches ».
// MAIR-1230: the linked task (a result of the header search, a messaging or dashboard link) opens on its own page;
// back on the board, its card is centred and focused once.
describe("Project page linked task", () => {
  const backToTasks = () => screen.getByRole("button", { name: /retour aux tâches$/ });

  it("MAIR-1230 opens the tasks tab on the linked task's page, then centres and focuses its card once back on the board", async () => {
    const user = userEvent.setup();
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    render(<ProjectPage {...pageProps()} />);
    expect(screen.getByRole("tab", { name: /^Tâches/ }).getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector('[data-task-page="task-1"]')).toBeTruthy();
    expect(document.querySelector("[data-linked-task]")).toBeNull();
    expect(scrollIntoView).not.toHaveBeenCalled();

    await user.click(backToTasks());
    const task = document.querySelector('[data-linked-task="task-1"]');
    expect(document.querySelector("[data-task-page]")).toBeNull();
    expect(task.getAttribute("aria-current")).toBe("true");
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center" });
    expect(document.activeElement).toBe(task);
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
  });

  it("MAIR-1230 waits for the linked task to arrive and does not jump back on unrelated task refreshes", async () => {
    const user = userEvent.setup();
    const props = pageProps();
    const { rerender } = render(<ProjectPage {...props} tasks={[]} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(document.querySelector("[data-task-page]")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1 }));

    rerender(<ProjectPage {...props} />);
    expect(document.querySelector('[data-task-page="task-1"]')).toBeTruthy();

    await user.click(backToTasks());
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(document.querySelector("[data-linked-task]"));

    rerender(<ProjectPage {...props} tasks={props.tasks.map(task => ({ ...task }))} />);
    expect(scrollIntoView).toHaveBeenCalledOnce();
  });

  it("MAIR-1230 does not move the focus back to the linked task after returning from another task's page", async () => {
    const user = userEvent.setup();
    const other = fixtures.projectTask({ id: "task-2", title: "Plan des voiries" });
    const props = pageProps();
    render(<ProjectPage {...props} tasks={[...props.tasks, other]} />);
    await user.click(backToTasks());
    expect(scrollIntoView).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Ouvrir la tâche Plan des voiries" }));
    expect(document.querySelector('[data-task-page="task-2"]')).toBeTruthy();
    await user.click(backToTasks());
    expect(document.querySelector("[data-task-page]")).toBeNull();
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(document.activeElement).not.toBe(document.querySelector('[data-linked-task="task-1"]'));
  });

  it("MAIR-1230 shows the board when the linked task is not in the project", () => {
    render(<ProjectPage {...pageProps()} highlightTaskId="task-404" />);
    expect(screen.getByRole("tab", { name: /^Tâches/ }).getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector("[data-task-page]")).toBeNull();
    expect(screen.getByRole("heading", { name: "Relevé des candélabres" })).toBeTruthy();
  });

  it("opens an ordinary project on its overview with the focus on its title", () => {
    render(<ProjectPage {...pageProps()} highlightTaskId={null} />);
    expect(screen.getByRole("tab", { name: "Vue d’ensemble" }).getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector("[data-linked-task]")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1 }));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("keeps keyboard navigation in the edit modal and goes back to the list from the breadcrumb", async () => {
    const user = userEvent.setup();
    const props = pageProps();
    render(<ProjectPage {...props} highlightTaskId={null} />);
    await user.click(screen.getByRole("button", { name: "Modifier", exact: true }));
    const dialog = screen.getByRole("dialog", { name: /^Modifier le projet/ });
    const form = within(screen.getByRole("form", { name: "Modifier le projet" }));
    for (const name of [/^Titre/, /^Description/, /^Échéance/]) {
      const field = form.getByLabelText(name);
      await user.click(field);
      expect(document.activeElement).toBe(field);
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(field);
    }
    await user.click(form.getByRole("button", { name: "Annuler", exact: true }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.keyboard("{Escape}");
    expect(props.onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Projets" }));
    expect(props.onClose).toHaveBeenCalledOnce();
  });
});
