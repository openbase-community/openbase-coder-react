import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { TabPosition } from "@/lib/workspace-tabs";

export const TAB_POSITION_KEY = "openbase-coder:tab-position";
const eventName = "openbase-coder:tab-position-changed";

function read(): TabPosition {
  try {
    return window.localStorage.getItem(TAB_POSITION_KEY) === "vertical"
      ? "vertical"
      : "horizontal";
  } catch {
    return "horizontal";
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

function setPosition(value: TabPosition) {
  try {
    window.localStorage.setItem(TAB_POSITION_KEY, value);
    window.dispatchEvent(new Event(eventName));
  } catch {
    toast.error("Could not save tab position");
  }
}

export function useTabPosition() {
  return [
    useSyncExternalStore<TabPosition>(subscribe, read, () => "horizontal"),
    setPosition,
  ] as const;
}
