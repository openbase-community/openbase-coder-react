// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DockLocation } from "flexlayout-react";
import { WorkspaceController } from "@/lib/workspace/WorkspaceController";
import {
  workspaceShortcut,
  runWorkspaceShortcut,
} from "@/lib/workspace/keyboard";
import { useWorkspaceKeyboard } from "./useWorkspaceKeyboard";

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("workspace shortcuts", () => {
  it("maps platform-specific splits without hijacking text or composition", () => {
    const key = (options: KeyboardEventInit, mac = true) =>
      workspaceShortcut(new KeyboardEvent("keydown", options), mac);
    expect(key({ key: "\\", metaKey: true })).toEqual({
      action: "split",
      direction: "right",
    });
    expect(
      key({ code: "Backslash", key: "\u00ab", metaKey: true, altKey: true }),
    ).toEqual({ action: "split", direction: "down" });
    expect(key({ key: "\\", ctrlKey: true }, false)).toEqual({
      action: "split",
      direction: "right",
    });
    expect(key({ key: "Tab", ctrlKey: true, shiftKey: true })).toEqual({
      action: "cycle-tab",
      offset: -1,
    });
    expect(key({ key: "Tab" })).toBeUndefined();
    expect(
      key({ key: "\\", metaKey: true, isComposing: true }),
    ).toBeUndefined();
    expect(key({ key: "a", metaKey: true })).toBeUndefined();
    expect(key({ key: "1", metaKey: true })).toEqual({
      action: "select-tab",
      index: 0,
    });
    expect(key({ key: "w", metaKey: true })).toEqual({ action: "close-tab" });
    expect(key({ key: "w", ctrlKey: true }, false)).toEqual({
      action: "close-tab",
    });
    expect(key({ key: "w", metaKey: true, shiftKey: true })).toBeUndefined();
    expect(key({ key: "2", ctrlKey: true }, false)).toEqual({
      action: "select-tab",
      index: 1,
    });
  });

  it("selects numbered tabs in the focused pane, with 9 selecting the last tab", () => {
    const controller = new WorkspaceController();
    const first = controller.focused!;
    controller.openTab({ path: "/dashboard/reports", title: "Reports" });
    const second = controller.focused!;
    controller.split(DockLocation.RIGHT);
    const third = controller.focused!;
    controller.focus(first.getId());
    runWorkspaceShortcut(controller, { action: "select-tab", index: 1 });
    expect(controller.focused).toBe(second);
    runWorkspaceShortcut(controller, { action: "cycle-tab", offset: 1 });
    expect(controller.focused).toBe(first);
    runWorkspaceShortcut(controller, { action: "cycle-tab", offset: -1 });
    expect(controller.focused).toBe(second);
    runWorkspaceShortcut(controller, { action: "select-tab", index: 0 });
    expect(controller.focused).toBe(first);
    runWorkspaceShortcut(controller, { action: "select-tab", index: 8 });
    expect(controller.focused).toBe(second);
    controller.focus(third.getId());
    runWorkspaceShortcut(controller, { action: "select-tab", index: 1 });
    expect(controller.focused).toBe(third);
    expect(controller.tabs).toHaveLength(3);
  });

  it("restores editor focus, respects modal menus, and removes its listener", () => {
    vi.spyOn(window.navigator, "platform", "get").mockReturnValue("MacIntel");
    let frame: FrameRequestCallback = () => {};
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frame = callback;
      return 1;
    });
    const controller = new WorkspaceController();
    const first = controller.focused!.getId();
    controller.openTab({ path: "/dashboard/reports", title: "Reports" });
    const second = controller.focused!.getId();
    const host = document.createElement("div");
    const editors = [first, second].map((id) => {
      const panel = document.createElement("div");
      panel.dataset.workspacePanel = id;
      panel.tabIndex = -1;
      const editor = document.createElement("textarea");
      panel.append(editor);
      host.append(panel);
      return editor;
    });
    document.body.append(host);
    const { unmount } = renderHook(() =>
      useWorkspaceKeyboard(controller, host),
    );
    editors[0].focus();
    editors[1].focus();
    const cycle = (
      options: KeyboardEventInit = { key: "Tab", ctrlKey: true },
    ) => {
      const event = new KeyboardEvent("keydown", {
        ...options,
        bubbles: true,
        cancelable: true,
      });
      act(() => document.activeElement!.dispatchEvent(event));
      act(() => frame(0));
      return event.defaultPrevented;
    };
    expect(cycle()).toBe(true);
    expect(controller.focused!.getId()).toBe(first);
    expect(document.activeElement).toBe(editors[0]);
    expect(cycle({ key: "2", metaKey: true })).toBe(true);
    expect(controller.focused!.getId()).toBe(second);
    expect(document.activeElement).toBe(editors[1]);
    expect(cycle({ key: "1", metaKey: true })).toBe(true);
    expect(controller.focused!.getId()).toBe(first);
    const menu = document.createElement("div");
    menu.role = "menu";
    menu.dataset.state = "open";
    document.body.append(menu);
    expect(cycle()).toBe(false);
    expect(controller.focused!.getId()).toBe(first);
    delete menu.dataset.state;
    expect(cycle({ key: "w", metaKey: true })).toBe(false);
    expect(controller.tabs).toHaveLength(2);
    menu.remove();
    unmount();
    expect(cycle()).toBe(false);
  });

  it("closes the focused tab through draft confirmation and retains the final tab", () => {
    vi.spyOn(window.navigator, "platform", "get").mockReturnValue("MacIntel");
    const controller = new WorkspaceController();
    controller.openTab({ path: "/dashboard/reports", title: "Reports" });
    controller
      .runtime(controller.focused!.getId())
      .drafts.set("prompt", "unfinished");
    const host = document.createElement("div");
    document.body.append(host);
    renderHook(() => useWorkspaceKeyboard(controller, host));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const close = () =>
      act(() =>
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "w",
            metaKey: true,
            bubbles: true,
            cancelable: true,
          }),
        ),
      );
    close();
    expect(confirm).toHaveBeenCalledOnce();
    expect(controller.tabs).toHaveLength(2);
    confirm.mockReturnValue(true);
    close();
    expect(controller.tabs).toHaveLength(1);
    close();
    expect(controller.tabs).toHaveLength(1);
  });
});
