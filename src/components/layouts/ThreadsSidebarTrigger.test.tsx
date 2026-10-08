// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
import { ThreadsSidebarTrigger } from "./DashboardLayout";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

const setWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: width < 768,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
};

function Shell({ open = true }: { open?: boolean }) {
  return (
    <SidebarProvider defaultOpen={open}>
      <Sidebar mobileTitle="Navigation">
        <p>Sidebar body</p>
      </Sidebar>
      <ThreadsSidebarTrigger />
    </SidebarProvider>
  );
}

beforeEach(() => setWidth(1280));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ThreadsSidebarTrigger", () => {
  it("names the desktop action after the threads sidebar state", () => {
    render(<Shell />);
    const trigger = screen.getByRole("button", { name: "Hide threads sidebar" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("title")).toBe("Hide threads sidebar (⌘B)");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-label")).toBe("Show threads sidebar");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("on a phone follows the sheet, not the desktop state, and the sheet has a title", () => {
    setWidth(390);
    // Desktop state is "open", which used to leak into the phone label.
    render(<Shell open />);
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(trigger);
    const sheet = screen.getByRole("dialog", { name: "Navigation" });
    expect(sheet.textContent).toContain("Sidebar body");
    expect(
      screen.getAllByRole("button", { name: "Close navigation", hidden: true }),
    ).toHaveLength(1);
  });
});
