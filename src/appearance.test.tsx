// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AppearanceProvider } from "./appearance";
import { AppearanceSettings } from "@/pages/settings/AppearanceSettings";

let systemDark = false;
const mediaListeners = new Set<(event: { matches: boolean }) => void>();

beforeEach(() => {
  const stored = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  });
  systemDark = false;
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    matches: systemDark,
    addListener: (listener: (event: { matches: boolean }) => void) =>
      mediaListeners.add(listener),
    removeListener: (listener: (event: { matches: boolean }) => void) =>
      mediaListeners.delete(listener),
  })));
  window.__OPENBASE_APPEARANCE__ = { setTheme: vi.fn() };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete window.__OPENBASE_APPEARANCE__;
  document.documentElement.className = "";
  document.documentElement.style.colorScheme = "";
  mediaListeners.clear();
});

function settings() {
  return render(
    <AppearanceProvider>
      <AppearanceSettings />
      <AppearanceSettings />
    </AppearanceProvider>,
  );
}

it("applies and persists one appearance across panes and remounts", () => {
  const view = settings();
  expect(document.documentElement.classList.contains("light")).toBe(true);
  fireEvent.click(screen.getAllByRole("radio", { name: "Dark" })[0]);
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(document.documentElement.style.colorScheme).toBe("dark");
  expect(window.localStorage.getItem("openbase-appearance")).toBe("dark");
  expect(window.__OPENBASE_APPEARANCE__!.setTheme).toHaveBeenLastCalledWith("dark");
  for (const input of screen.getAllByRole("radio", { name: "Dark" }))
    expect((input as HTMLInputElement).checked).toBe(true);
  view.unmount();
  settings();
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  fireEvent.click(screen.getAllByRole("radio", { name: "Light" })[1]);
  expect(document.documentElement.classList.contains("dark")).toBe(false);
});

it("follows system changes only when System is selected", () => {
  settings();
  fireEvent.click(screen.getAllByRole("radio", { name: "System" })[0]);
  expect(window.__OPENBASE_APPEARANCE__!.setTheme).toHaveBeenLastCalledWith("system");
  act(() => {
    systemDark = true;
    mediaListeners.forEach((listener) => listener({ matches: true }));
  });
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  fireEvent.click(screen.getAllByRole("radio", { name: "Light" })[0]);
  act(() => mediaListeners.forEach((listener) => listener({ matches: true })));
  expect(document.documentElement.classList.contains("light")).toBe(true);
});

it("synchronizes appearance changes from another browser window", () => {
  settings();
  act(() => window.dispatchEvent(new StorageEvent("storage", {
    key: "openbase-appearance",
    newValue: "dark",
  })));
  expect(document.documentElement.classList.contains("dark")).toBe(true);
});
