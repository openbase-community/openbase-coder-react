import { DockLocation } from "flexlayout-react";
import type { WorkspaceController } from "./WorkspaceController";

export type WorkspaceShortcut =
  | { action: "cycle-tab"; offset: number }
  | { action: "select-tab"; index: number }
  | { action: "close-tab" }
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
  if (!altKey && key.toLowerCase() === "w") return { action: "close-tab" };
  if (event.code === "Backslash" || key === "\\")
    return { action: "split", direction: altKey ? "down" : "right" };
  if (!altKey && /^[1-9]$/.test(key))
    return { action: "select-tab", index: Number(key) - 1 };
}

export function runWorkspaceShortcut(
  controller: WorkspaceController,
  shortcut: WorkspaceShortcut,
  confirmDiscard: () => boolean = () => false,
) {
  if (shortcut.action === "close-tab") {
    const id = controller.focused?.getId();
    if (id) controller.close(id, confirmDiscard);
    return;
  }
  if (shortcut.action === "split") {
    controller.split(
      shortcut.direction === "right" ? DockLocation.RIGHT : DockLocation.BOTTOM,
    );
    return;
  }
  const active = controller.focused;
  const tabs = controller.tabs.filter(
    (tab) => tab.getParent() === active?.getParent(),
  );
  const index = tabs.findIndex((tab) => tab === active);
  if (shortcut.action === "select-tab") {
    const tab = shortcut.index === 8 ? tabs.at(-1) : tabs[shortcut.index];
    if (tab) controller.focus(tab.getId());
    return;
  }
  if (tabs.length > 1)
    controller.focus(
      tabs[(index + shortcut.offset + tabs.length) % tabs.length].getId(),
    );
}
