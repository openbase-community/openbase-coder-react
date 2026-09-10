import { DockLocation, TabNode } from "flexlayout-react";
import type { WorkspaceController } from "./WorkspaceController";

export type WorkspaceShortcut =
  | { action: "cycle-tab"; offset: number }
  | { action: "focus-pane"; index: number }
  | { action: "split"; direction: "right" | "down" };

export function workspaceShortcut(
  event: Pick<
    KeyboardEvent,
    | "key"
    | "code"
    | "ctrlKey"
    | "metaKey"
    | "altKey"
    | "shiftKey"
    | "isComposing"
  >,
  mac: boolean,
): WorkspaceShortcut | undefined {
  if (event.isComposing) return;
  const { key, ctrlKey, metaKey, altKey, shiftKey } = event;
  if (ctrlKey && !metaKey && !altKey && key === "Tab")
    return { action: "cycle-tab", offset: shiftKey ? -1 : 1 };
  if (
    mac &&
    metaKey &&
    altKey &&
    !ctrlKey &&
    !shiftKey &&
    (key === "ArrowLeft" || key === "ArrowRight")
  )
    return { action: "cycle-tab", offset: key === "ArrowLeft" ? -1 : 1 };
  const primary = mac ? metaKey && !ctrlKey : ctrlKey && !metaKey;
  if (!primary || shiftKey) return;
  if (event.code === "Backslash" || key === "\\")
    return { action: "split", direction: altKey ? "down" : "right" };
  if (!altKey && /^[1-9]$/.test(key))
    return { action: "focus-pane", index: Number(key) - 1 };
}

export function runWorkspaceShortcut(
  controller: WorkspaceController,
  shortcut: WorkspaceShortcut,
) {
  if (shortcut.action === "split") {
    controller.split(
      shortcut.direction === "right" ? DockLocation.RIGHT : DockLocation.BOTTOM,
    );
    return;
  }
  if (shortcut.action === "focus-pane") {
    const groups = [...new Set(controller.tabs.map((tab) => tab.getParent()))];
    const tab = groups[shortcut.index]
      ?.getChildren()
      .find((node) => node instanceof TabNode && node.isSelected());
    if (tab) controller.focus(tab.getId());
    return;
  }
  const active = controller.focused;
  const tabs = controller.tabs.filter(
    (tab) => tab.getParent() === active?.getParent(),
  );
  const index = tabs.findIndex((tab) => tab === active);
  if (tabs.length > 1)
    controller.focus(
      tabs[(index + shortcut.offset + tabs.length) % tabs.length].getId(),
    );
}
