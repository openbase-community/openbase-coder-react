// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1280,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("Cmd/Ctrl+B toggles a controlled, hidden sidebar back on regardless of key case", () => {
  const onOpenChange = vi.fn();
  render(
    <SidebarProvider open={false} onOpenChange={onOpenChange}>
      <div />
    </SidebarProvider>,
  );
  fireEvent.keyDown(window, { key: "b", metaKey: true });
  expect(onOpenChange).toHaveBeenLastCalledWith(true);
  fireEvent.keyDown(window, { key: "B", metaKey: true });
  expect(onOpenChange).toHaveBeenLastCalledWith(true);
  fireEvent.keyDown(window, { key: "b", ctrlKey: true });
  expect(onOpenChange).toHaveBeenCalledTimes(3);
  fireEvent.keyDown(window, { key: "b" });
  expect(onOpenChange).toHaveBeenCalledTimes(3);
});

it("Cmd+B hides a controlled, visible sidebar", () => {
  const onOpenChange = vi.fn();
  render(
    <SidebarProvider open onOpenChange={onOpenChange}>
      <div />
    </SidebarProvider>,
  );
  fireEvent.keyDown(window, { key: "b", metaKey: true });
  expect(onOpenChange).toHaveBeenLastCalledWith(false);
});
