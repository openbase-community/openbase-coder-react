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
  });

  it("wraps within the focused pane and focuses pane numbers without creating tabs", () => {
    const controller = new WorkspaceController();
    const first = controller.focused!;
    controller.openTab({ path: "/dashboard/reports", title: "Reports" });
    const second = controller.focused!;
    controller.split(DockLocation.RIGHT);
    const third = controller.focused!;
    runWorkspaceShortcut(controller, { action: "focus-pane", index: 0 });
    expect(controller.focused).toBe(second);
    runWorkspaceShortcut(controller, { action: "cycle-tab", offset: 1 });
    expect(controller.focused).toBe(first);
    runWorkspaceShortcut(controller, { action: "cycle-tab", offset: -1 });
    expect(controller.focused).toBe(second);
    runWorkspaceShortcut(controller, { action: "focus-pane", index: 1 });
    expect(controller.focused).toBe(third);
    runWorkspaceShortcut(controller, { action: "focus-pane", index: 8 });
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
    const cycle = () => {
      const event = new KeyboardEvent("keydown", {
        key: "Tab",
        ctrlKey: true,
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
    const menu = document.createElement("div");
    menu.role = "menu";
    menu.dataset.state = "open";
    document.body.append(menu);
    expect(cycle()).toBe(false);
    expect(controller.focused!.getId()).toBe(first);
    menu.remove();
    unmount();
    expect(cycle()).toBe(false);
  });
});
