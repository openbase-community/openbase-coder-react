import type { SidebarItem } from "@/lib/sidebar-preferences";

export const WORKSPACE_ORDER = [
  "overview",
  "dispatch",
  "threads",
  "projects",
  "reports",
  "approvals",
] as const;

export const CREATE_ORDER = ["routines", "skills", "templates"] as const;

export const SYSTEM_ORDER = [
  "status",
  "devices",
  "sync",
  "agents-md",
  "tools",
  "launchctl",
  "cloud",
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

export function navigationTitle(item: Pick<SidebarItem, "key" | "title">) {
  return item.key === "launchctl" ? "Services" : item.title;
}
