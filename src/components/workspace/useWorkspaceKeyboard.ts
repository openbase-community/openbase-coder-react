import { useEffect } from "react";
import type { WorkspaceController } from "@/lib/workspace/WorkspaceController";
import {
  runWorkspaceShortcut,
  workspaceShortcut,
} from "@/lib/workspace/keyboard";

export function useWorkspaceKeyboard(
  controller: WorkspaceController,
  host: HTMLElement | null,
) {
  useEffect(() => {
    if (!host) return;
    const document = host.ownerDocument;
    const window = document.defaultView!;
    const mac = /Mac|iPhone|iPad/.test(window.navigator.platform);
    const lastFocus = new Map<string, HTMLElement>();
    let frame = 0;
    const rememberFocus = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      const panel = event.target.closest<HTMLElement>("[data-workspace-panel]");
      if (panel?.dataset.workspacePanel)
        lastFocus.set(panel.dataset.workspacePanel, event.target);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (
        document.querySelector(
          '[role="dialog"], [role="alertdialog"], [role="menu"][data-state="open"]',
        )
      )
        return;
      const shortcut = workspaceShortcut(event, mac);
      if (!shortcut) return;
      event.preventDefault();
      event.stopPropagation();
      runWorkspaceShortcut(controller, shortcut);
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const id = controller.focused?.getId();
        const panel = [
          ...host.querySelectorAll<HTMLElement>("[data-workspace-panel]"),
        ].find((element) => element.dataset.workspacePanel === id);
        const previous = id ? lastFocus.get(id) : undefined;
        (previous && panel?.contains(previous) ? previous : panel)?.focus({
          preventScroll: true,
        });
        for (const key of lastFocus.keys())
          if (!controller.model.getNodeById(key)) lastFocus.delete(key);
      });
    };
    document.addEventListener("focusin", rememberFocus);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("focusin", rememberFocus);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [controller, host]);
}
