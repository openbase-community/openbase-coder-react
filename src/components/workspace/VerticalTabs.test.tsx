// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DockLocation } from "flexlayout-react";
import { WorkspaceTabsProvider } from "@/contexts/workspace-tabs";
import { WorkspaceController } from "@/lib/workspace/WorkspaceController";
import { TAB_POSITION_KEY, useTabPosition } from "@/hooks/useTabPosition";
import { TabSettings } from "@/pages/settings/TabSettings";
import { VerticalTabs } from "./VerticalTabs";

beforeEach(() => {
  const stored = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("defaults to horizontal and synchronizes saved preferences between mounted views", () => {
  function Current() {
    const [position] = useTabPosition();
    return <output>{position}</output>;
  }
  const { unmount } = render(
    <>
      <TabSettings />
      <Current />
    </>,
  );
  expect(
    (screen.getByRole("radio", { name: "Horizontal" }) as HTMLInputElement)
      .checked,
  ).toBe(true);
  fireEvent.click(screen.getByRole("radio", { name: "Vertical" }));
  expect(screen.getByRole("status").textContent).toBe("vertical");
  expect(localStorage.getItem(TAB_POSITION_KEY)).toBe("vertical");
  unmount();
  render(<TabSettings />);
  expect(
    (screen.getByRole("radio", { name: "Vertical" }) as HTMLInputElement)
      .checked,
  ).toBe(true);
  act(() => {
    localStorage.setItem(TAB_POSITION_KEY, "invalid");
    window.dispatchEvent(new StorageEvent("storage"));
  });
  expect(
    (screen.getByRole("radio", { name: "Horizontal" }) as HTMLInputElement)
      .checked,
  ).toBe(true);
});

it("changes presentation without losing tabs, drafts, pane sizes or undo history", () => {
  const controller = new WorkspaceController();
  controller.openTab({ path: "/dashboard/reports", title: "Reports" });
  const tab = controller.focused!;
  controller.runtime(tab.getId()).drafts.set("prompt", "unfinished");
  controller.split(DockLocation.RIGHT);
  const layout = controller.serialize().layout;
  controller.setTabPosition("vertical");
  expect(controller.verticalTabs).toBe(true);
  expect(controller.model.toJson().global?.tabSetEnableTabStrip).toBe(false);
  expect(controller.serialize().layout).toEqual(layout);
  controller.undo();
  expect(controller.tabs).toHaveLength(2);
  expect(controller.verticalTabs).toBe(true);
  expect(controller.runtime(tab.getId()).drafts.get("prompt")).toBe(
    "unfinished",
  );
  controller.setCompact(true);
  expect(controller.verticalTabs).toBe(false);
  expect(controller.model.getFirstTabSet().isEnableTabStrip()).toBe(true);
  controller.setCompact(false);
  expect(controller.verticalTabs).toBe(true);
  controller.setTabPosition("horizontal");
  expect(controller.model.getFirstTabSet().isEnableTabStrip()).toBe(true);
});

it("supports vertical keyboard navigation, closing with draft protection, and pane groups", () => {
  const controller = new WorkspaceController();
  controller.openTab({ path: "/dashboard/reports", title: "Reports" });
  const report = controller.focused!;
  render(
    <WorkspaceTabsProvider initialController={controller}>
      <VerticalTabs />
    </WorkspaceTabsProvider>,
  );
  fireEvent.keyDown(screen.getByRole("tab", { name: "Reports" }), {
    key: "Home",
  });
  expect(controller.path).toBe("/dashboard");
  expect(document.activeElement).toBe(
    screen.getByRole("tab", { name: "Overview" }),
  );
  fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
  expect(controller.path).toBe("/dashboard/reports");
  controller.runtime(report.getId()).drafts.set("prompt", "keep this");
  vi.spyOn(window, "confirm").mockReturnValue(false);
  fireEvent.click(screen.getByRole("button", { name: "Close Reports" }));
  expect(controller.tabs).toHaveLength(2);
  act(() => controller.split(DockLocation.RIGHT));
  expect(screen.getAllByRole("tablist")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Close Overview" }));
  expect(controller.tabs).toHaveLength(2);
});

it("reorders existing tabs and moves them between pane lists without replacing their runtime", () => {
  const controller = new WorkspaceController();
  const first = controller.focused!;
  controller.runtime(first.getId()).drafts.set("prompt", "keep this");
  controller.openTab({ path: "/dashboard/reports", title: "Reports" });
  const report = controller.focused!;
  render(
    <WorkspaceTabsProvider initialController={controller}>
      <VerticalTabs />
    </WorkspaceTabsProvider>,
  );
  const transfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
  const drop = (source: HTMLElement, target: HTMLElement) => {
    fireEvent.dragStart(source, { dataTransfer: transfer });
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clientY", { value: 10 });
    fireEvent(target, event);
  };
  drop(
    screen.getByRole("tab", { name: "Overview" }),
    screen.getByRole("tab", { name: "Reports" }),
  );
  expect(controller.tabs.map((tab) => tab.getId())).toEqual([
    report.getId(),
    first.getId(),
  ]);
  act(() => controller.split(DockLocation.RIGHT));
  const split = controller.focused!;
  drop(
    screen.getByRole("tab", { name: "Reports" }),
    screen.getAllByRole("tab", { name: "Overview" })[1],
  );
  expect(report.getParent()).toBe(split.getParent());
  expect(controller.tabs).toHaveLength(3);
  expect(controller.runtime(first.getId()).drafts.get("prompt")).toBe(
    "keep this",
  );
  act(() => controller.undo());
  expect(
    controller.tabs
      .find((tab) => tab.getId() === report.getId())
      ?.getParent()
      ?.getId(),
  ).not.toBe(split.getParent()?.getId());
});
