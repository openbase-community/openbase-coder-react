import type { SidebarItem } from "@/lib/sidebar-preferences";

/**
 * Single source of truth for the order Openbase destinations appear in, shared
 * by the browser console and Electron host so their information architecture
 * never diverges. Keys not listed keep their built-in order after the ranked
 * ones. Keep these keys in sync with BUILT_IN_SIDEBAR_ITEMS.
 */
export const WORKSPACE_ORDER = [
  "overview",
  "dispatch",
  "threads",
  "projects",
  "reports",
  "approvals",
  "routines",
  "skills",
  "memories",
  "templates",
] as const;

/**
 * System destinations, ordered. "cloud" is intentionally excluded here — it is
 * an external link rendered in the sidebar footer above Settings, not inside
 * the collapsible System group.
 */
export const SYSTEM_ORDER = [
  "status",
  "devices",
  "sync",
  "agents-md",
  "tools",
  "launchctl",
] as const;

export function orderNavigationItems(
  items: SidebarItem[],
  order: readonly string[],
): SidebarItem[] {
  const rank = new Map(order.map((key, index) => [key, index]));
  return [...items].sort(
    (left, right) =>
      (rank.get(left.key) ?? Number.MAX_SAFE_INTEGER) -
      (rank.get(right.key) ?? Number.MAX_SAFE_INTEGER),
  );
}

/**
 * Friendly, human-facing label for a destination. The sidebar preference key
 * "launchctl" is a macOS implementation detail; users think of it as Services.
 */
export function navigationTitle(item: Pick<SidebarItem, "key" | "title">) {
  return item.key === "launchctl" ? "Services" : item.title;
}
