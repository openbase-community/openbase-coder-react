import { useSyncExternalStore } from "react";
import { toast } from "sonner";

/** Opt-in: thread views offer a Terminal tab running the native backend TUI. */
export const THREAD_TERMINAL_TAB_KEY = "openbase-coder:thread-terminal-tab";
const eventName = "openbase-coder:thread-terminal-tab-changed";

function read(): boolean {
  try {
    return window.localStorage.getItem(THREAD_TERMINAL_TAB_KEY) === "enabled";
  } catch {
    return false;
  }
}

function subscribe(listener: () => void) {
  window.addEventListener(eventName, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener("storage", listener);
  };
}

function setEnabled(value: boolean) {
  try {
    if (value) {
      window.localStorage.setItem(THREAD_TERMINAL_TAB_KEY, "enabled");
    } else {
      window.localStorage.removeItem(THREAD_TERMINAL_TAB_KEY);
    }
    window.dispatchEvent(new Event(eventName));
  } catch {
    toast.error("Could not save the terminal tab setting");
  }
}

export function useThreadTerminalTab() {
  return [
    useSyncExternalStore<boolean>(subscribe, read, () => false),
    setEnabled,
  ] as const;
}
