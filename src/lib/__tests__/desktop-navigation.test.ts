import {
  DESKTOP_CREATE_ORDER,
  DESKTOP_SYSTEM_ORDER,
  DESKTOP_WORKSPACE_ORDER,
  desktopSidebarTitle,
  orderDesktopItems,
} from "../desktop-navigation";
import { BUILT_IN_SIDEBAR_ITEMS } from "../sidebar-preferences";
import { describe, expect, it } from "vitest";

describe("desktop navigation", () => {
  it("uses the desktop information architecture without changing source items", () => {
    const workspace = orderDesktopItems(
      BUILT_IN_SIDEBAR_ITEMS.filter((item) =>
        [...DESKTOP_WORKSPACE_ORDER, ...DESKTOP_CREATE_ORDER].includes(
          item.key as (typeof DESKTOP_WORKSPACE_ORDER)[number],
        ),
      ),
      [...DESKTOP_WORKSPACE_ORDER, ...DESKTOP_CREATE_ORDER],
    );

    expect(workspace.map((item) => item.key)).toEqual([
      ...DESKTOP_WORKSPACE_ORDER,
      ...DESKTOP_CREATE_ORDER,
    ]);
    expect(BUILT_IN_SIDEBAR_ITEMS.find((item) => item.key === "launchctl")?.title).toBe(
      "Launchctl",
    );
  });

  it("orders the collapsible system group and gives Launchctl a friendly label", () => {
    const system = orderDesktopItems(
      BUILT_IN_SIDEBAR_ITEMS.filter((item) =>
        DESKTOP_SYSTEM_ORDER.includes(item.key as (typeof DESKTOP_SYSTEM_ORDER)[number]),
      ),
      DESKTOP_SYSTEM_ORDER,
    );

    expect(system.map((item) => item.key)).toEqual(DESKTOP_SYSTEM_ORDER);
    expect(desktopSidebarTitle(system.find((item) => item.key === "launchctl")!)).toBe(
      "Services",
    );
  });
});
