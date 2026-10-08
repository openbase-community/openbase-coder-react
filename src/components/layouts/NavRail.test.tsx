// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api";
import { openExternalUrl } from "@/lib/external-links";
import {
  SIDEBAR_HIDDEN_ITEMS_STORAGE_KEY,
  writeHiddenSidebarItems,
} from "@/lib/sidebar-preferences";
import { NavRail, railFooterItems, railItems, railMoreItems } from "./NavRail";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/external-links", () => ({ openExternalUrl: vi.fn() }));

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderRail(initial = "/dashboard/reports") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <TooltipProvider>
        <NavRail />
      </TooltipProvider>
      <Location />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  const stored = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  });
  vi.mocked(apiFetch).mockResolvedValue(
    Response.json({
      services: {
        api: { name: "api", port: 1, running: true },
        voice: { name: "voice", port: 2, running: false },
      },
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("rail item selection", () => {
  it("keeps the shared workspace order and tucks system pages behind More", () => {
    expect(railItems([], []).map((item) => item.key)).toEqual([
      "dispatch",
      "threads",
      "projects",
      "reports",
      "approvals",
      "configure",
    ]);
    expect(railMoreItems([]).map((item) => item.key)).toEqual([
      "status",
      "devices",
      "sync",
      "agents-md",
      "tools",
      "launchctl",
    ]);
    expect(railFooterItems([]).map((item) => item.key)).toEqual([
      "cloud",
      "settings",
    ]);
  });

  it("honours hidden items but never hides Settings", () => {
    const hidden = ["reports", "status", "settings", "cloud"];
    expect(railItems(hidden, []).map((item) => item.key)).not.toContain(
      "reports",
    );
    expect(railMoreItems(hidden).map((item) => item.key)).not.toContain(
      "status",
    );
    expect(railFooterItems(hidden).map((item) => item.key)).toEqual([
      "settings",
    ]);
  });
});

describe("NavRail", () => {
  it("renders one labelled button per destination and highlights the current one", () => {
    renderRail();
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav.getAttribute("data-orientation")).toBe("vertical");
    const reports = screen.getByRole("button", { name: "Reports" });
    expect(reports.getAttribute("data-active")).toBe("true");
    expect(
      screen.getByRole("button", { name: "Dispatch" }).getAttribute("data-active"),
    ).toBe("false");
    expect(screen.getByRole("button", { name: "Settings" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cloud" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Threads" }));
    expect(screen.getByTestId("location").textContent).toBe("/dashboard/threads");
    expect(reports.getAttribute("data-active")).toBe("false");
  });

  it("opens external destinations outside the pane router", () => {
    renderRail();
    fireEvent.click(screen.getByRole("button", { name: "Cloud" }));
    expect(openExternalUrl).toHaveBeenCalledWith("https://app.openbase.cloud");
    expect(screen.getByTestId("location").textContent).toBe("/dashboard/reports");
  });

  it("lists system pages under More and navigates from there", async () => {
    renderRail();
    fireEvent.pointerDown(screen.getByRole("button", { name: "More" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Services" }));
    expect(screen.getByTestId("location").textContent).toBe(
      "/dashboard/launchctl",
    );
  });

  it("reacts to sidebar preference changes", () => {
    renderRail();
    expect(screen.getByRole("button", { name: "Approvals" })).toBeTruthy();
    act(() => writeHiddenSidebarItems(["approvals"]));
    expect(localStorage.getItem(SIDEBAR_HIDDEN_ITEMS_STORAGE_KEY)).toBe(
      JSON.stringify(["approvals"]),
    );
    expect(screen.queryByRole("button", { name: "Approvals" })).toBeNull();
  });
});
