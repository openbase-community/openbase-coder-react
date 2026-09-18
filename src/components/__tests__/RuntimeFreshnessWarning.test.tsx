// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RuntimeFreshnessWarning } from "../RuntimeFreshnessWarning";
import { developerFreshnessEnabled } from "@/lib/runtime-freshness";

afterEach(() => { cleanup(); delete window.__OPENBASE_RUNTIME_CONFIG__; });

describe("runtime freshness banner", () => {
  const stale = { component: "Voice worker", state: "stale" as const, reason: "cli: old → new", action: "Restart livekit-agent." };
  it("keeps details outside the row and reveals them on hover or click", () => {
    render(<RuntimeFreshnessWarning freshness={{ enabled: true, components: [stale] }} />);
    expect(screen.getByRole("status").textContent).toContain("1 component needs refreshing");
    expect(screen.queryByText("Voice worker")).toBeNull();
    fireEvent.mouseEnter(screen.getByRole("button"));
    expect(screen.getByRole("dialog", { name: "Runtime freshness details" })).toBeTruthy();
    expect(screen.getByText("Voice worker")).toBeTruthy();
    expect(screen.getByText("Restart livekit-agent.")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByText("Voice worker")).toBeNull();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Voice worker")).toBeTruthy();
  });
  it("clears after a verified refresh and suppresses production", () => {
    const view = render(<RuntimeFreshnessWarning freshness={{ enabled: true, components: [stale] }} />);
    view.rerender(<RuntimeFreshnessWarning freshness={{ enabled: true, components: [{ ...stale, state: "current" }] }} />);
    expect(view.container.textContent).toBe("");
    view.rerender(<RuntimeFreshnessWarning freshness={{ enabled: false, components: [stale] }} />);
    expect(view.container.textContent).toBe("");
  });
  it("unknown evidence is not called up to date", () => {
    render(<RuntimeFreshnessWarning freshness={{ enabled: true, components: [{ ...stale, state: "unknown" }] }} />);
    expect(screen.getByRole("status").textContent).toBe("Cannot verify 1 running component.");
  });
  it("production Electron never requests source checks", () => {
    window.__OPENBASE_RUNTIME_CONFIG__ = { shell: "electron", nonDeveloperInstall: true, developerDashboardOnly: true };
    expect(developerFreshnessEnabled()).toBe(false);
    window.__OPENBASE_RUNTIME_CONFIG__.nonDeveloperInstall = false;
    expect(developerFreshnessEnabled()).toBe(true);
  });
});
