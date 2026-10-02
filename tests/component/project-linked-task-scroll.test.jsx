import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectDetailModal } from "@/components/project/ProjectModals";
import fixtures from "../support/bff-fixtures.cjs";

let ancestorScroll;
let previousScrollIntoView;
let taskHeight;

beforeEach(() => {
  taskHeight = 100;
  ancestorScroll = vi.fn();
  previousScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: ancestorScroll });
  // jsdom has no layout. Supply only the geometry needed by the actual modal;
  // the native desktop/mobile recipe separately verifies the resulting pixels.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
    if (this.matches("[data-linked-task]")) return { top: 800, height: taskHeight };
    if (this.classList.contains("overflow-y-auto")) return { top: 100, height: 600 };
    return { top: 0, height: 0 };
  });
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function () {
    return this.classList.contains("overflow-y-auto") ? 600 : 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  if (previousScrollIntoView) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", previousScrollIntoView);
  else delete HTMLElement.prototype.scrollIntoView;
});

function modalProps() {
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

describe("Project linked task scrolling", () => {
  it.each([
    { height: 100, expectedScroll: 450 },
    { height: 700, expectedScroll: 700 },
  ])("scrolls only inner content for a $height-pixel task, preserving header and focus", ({ height, expectedScroll }) => {
    taskHeight = height;
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    render(<ProjectDetailModal {...modalProps()} />);

    const dialog = screen.getByRole("dialog");
    const content = dialog.querySelector(".overflow-y-auto");
    const task = dialog.querySelector('[data-linked-task="task-1"]');
    expect(content.scrollTop).toBe(expectedScroll);
    expect(dialog.scrollTop).toBe(0);
    expect(ancestorScroll).not.toHaveBeenCalled();
    expect(dialog.querySelector("header").classList.contains("shrink-0")).toBe(true);
    expect(task.getAttribute("aria-current")).toBe("true");
    expect(document.activeElement).toBe(task);
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(screen.getByRole("button", { name: "Fermer la fiche projet" })).toBeTruthy();
  });

  it("waits for the linked task to arrive and does not jump back on unrelated task refreshes", () => {
    const props = modalProps();
    const { rerender } = render(<ProjectDetailModal {...props} tasks={[]} />);
    const dialog = screen.getByRole("dialog");
    const content = dialog.querySelector(".overflow-y-auto");
    expect(content.scrollTop).toBe(0);
    expect(document.activeElement).toBe(dialog);

    rerender(<ProjectDetailModal {...props} />);
    expect(content.scrollTop).toBe(450);
    expect(document.activeElement).toBe(dialog.querySelector("[data-linked-task]"));

    content.scrollTop = 123;
    rerender(<ProjectDetailModal {...props} tasks={props.tasks.map(task => ({ ...task }))} />);
    expect(content.scrollTop).toBe(123);
    expect(dialog.scrollTop).toBe(0);
    expect(ancestorScroll).not.toHaveBeenCalled();
  });

  it("leaves ordinary project navigation at the top with initial dialog focus", () => {
    render(<ProjectDetailModal {...modalProps()} highlightTaskId={null} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector(".overflow-y-auto").scrollTop).toBe(0);
    expect(dialog.scrollTop).toBe(0);
    expect(dialog.querySelector("[data-linked-task]")).toBeNull();
    expect(document.activeElement).toBe(dialog);
    expect(ancestorScroll).not.toHaveBeenCalled();
  });
});
