import {
  SYSTEM_ORDER,
  WORKSPACE_ORDER,
  navigationTitle,
  orderNavigationItems,
} from "../app-navigation";
import { BUILT_IN_SIDEBAR_ITEMS } from "../sidebar-preferences";
import { describe, expect, it } from "vitest";

describe("shared app navigation", () => {
  it("uses one workspace ordering for the browser and Electron", () => {
    const workspace = orderNavigationItems(
      BUILT_IN_SIDEBAR_ITEMS.filter((item) =>
        WORKSPACE_ORDER.includes(item.key as (typeof WORKSPACE_ORDER)[number]),
      ),
      WORKSPACE_ORDER,
    );

    expect(workspace.map((item) => item.key)).toEqual([...WORKSPACE_ORDER]);
  });

  it("orders system destinations and gives Launchctl a friendly label", () => {
    const system = orderNavigationItems(
      BUILT_IN_SIDEBAR_ITEMS.filter((item) =>
        SYSTEM_ORDER.includes(item.key as (typeof SYSTEM_ORDER)[number]),
      ),
      SYSTEM_ORDER,
    );

    expect(system.map((item) => item.key)).toEqual(SYSTEM_ORDER);
    expect(
      navigationTitle(system.find((item) => item.key === "launchctl")!),
    ).toBe("Services");
  });

  it("keeps Cloud out of the collapsible System group", () => {
    // Cloud is rendered in the footer above Settings, not in the System group.
    expect(SYSTEM_ORDER).not.toContain("cloud");
  });

  it("references only keys that exist in the built-in sidebar items", () => {
    const known = new Set(BUILT_IN_SIDEBAR_ITEMS.map((item) => item.key));
    for (const key of [...WORKSPACE_ORDER, ...SYSTEM_ORDER]) {
      expect(known.has(key)).toBe(true);
    }
  });
});
