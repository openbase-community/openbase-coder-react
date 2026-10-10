import { describe, expect, it } from "vitest";
import { installWindowActivityAttribute } from "../../window-activity";

function fakeTarget() {
  const listeners = new Map<string, Set<() => void>>();
  return {
    listeners,
    addEventListener(type: string, fn: () => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: () => void) {
      listeners.get(type)?.delete(fn);
    },
    fire(type: string) {
      listeners.get(type)?.forEach((fn) => fn());
    },
  };
}

function fakeDocument() {
  const target = fakeTarget();
  const doc = {
    ...target,
    focused: true,
    visibilityState: "visible" as DocumentVisibilityState,
    hasFocus() {
      return doc.focused;
    },
    documentElement: { dataset: {} as DOMStringMap },
  };
  return doc;
}

describe("installWindowActivityAttribute", () => {
  it("marks the root inactive while blurred or hidden and clears it on return", () => {
    const doc = fakeDocument();
    const win = fakeTarget();
    const cleanup = installWindowActivityAttribute(doc, win);
    expect(doc.documentElement.dataset.windowInactive).toBeUndefined();

    doc.focused = false;
    win.fire("blur");
    expect(doc.documentElement.dataset.windowInactive).toBe("true");

    doc.focused = true;
    win.fire("focus");
    expect(doc.documentElement.dataset.windowInactive).toBeUndefined();

    doc.visibilityState = "hidden";
    doc.fire("visibilitychange");
    expect(doc.documentElement.dataset.windowInactive).toBe("true");

    cleanup();
    expect(doc.documentElement.dataset.windowInactive).toBeUndefined();
    expect([...win.listeners.values()].every((set) => set.size === 0)).toBe(true);
    expect([...doc.listeners.values()].every((set) => set.size === 0)).toBe(true);
  });

  it("starts inactive when the window opens without focus", () => {
    const doc = fakeDocument();
    doc.focused = false;
    installWindowActivityAttribute(doc, fakeTarget());
    expect(doc.documentElement.dataset.windowInactive).toBe("true");
  });
});
