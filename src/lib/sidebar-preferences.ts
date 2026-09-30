import {
  Activity,
  Cloud,
  FilePenLine,
  FileText,
  FolderOpen,
  FolderSync,
  LucideIcon,
  Megaphone,
  MessageSquare,
  Monitor,
  Server,
  Settings as SettingsIcon,
  ShieldAlert,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { CONFIGURE_DEFAULT_PATH, CONFIGURE_TABS } from "./configure-tabs";

export type SidebarSection = "workspace" | "system" | "plugins";

export type SidebarItem = {
  key: string;
  path: string;
  icon: LucideIcon;
  title: string;
  section: SidebarSection;
  externalUrl?: string;
  exact?: boolean;
  locked?: boolean;
  /** Extra route prefixes that should also highlight this item. */
  activePaths?: readonly string[];
};

export const SIDEBAR_HIDDEN_ITEMS_STORAGE_KEY =
  "openbase-coder:sidebar-hidden-items";
export const SIDEBAR_PREFERENCES_EVENT = "openbase-coder:sidebar-preferences";

export const BUILT_IN_SIDEBAR_ITEMS: SidebarItem[] = [
  {
    key: "projects",
    path: "/dashboard/projects",
    icon: FolderOpen,
    title: "Projects",
    section: "workspace",
  },
  {
    key: "reports",
    path: "/dashboard/reports",
    icon: FileText,
    title: "Reports",
    section: "workspace",
  },
  {
    key: "dispatch",
    path: "/dashboard/dispatch",
    icon: Megaphone,
    title: "Dispatch",
    section: "workspace",
  },
  {
    key: "threads",
    path: "/dashboard/threads",
    icon: MessageSquare,
    title: "Threads",
    section: "workspace",
  },
  {
    key: "approvals",
    path: "/dashboard/approvals",
    icon: ShieldAlert,
    title: "Approvals",
    section: "workspace",
  },
  {
    key: "configure",
    path: CONFIGURE_DEFAULT_PATH,
    icon: SlidersHorizontal,
    title: "Configure",
    section: "workspace",
    activePaths: CONFIGURE_TABS.map((tab) => tab.path),
  },
  {
    key: "status",
    path: "/dashboard/status",
    icon: Activity,
    title: "Status",
    section: "system",
  },
  {
    key: "devices",
    path: "/dashboard/devices",
    icon: Monitor,
    title: "Devices",
    section: "system",
  },
  {
    key: "sync",
    path: "/dashboard/sync",
    icon: FolderSync,
    title: "Sync",
    section: "system",
  },
  {
    key: "agents-md",
    path: "/dashboard/instructions",
    icon: FilePenLine,
    title: "Instructions",
    section: "system",
  },
  {
    key: "tools",
    path: "/dashboard/tools",
    icon: Wrench,
    title: "Tools",
    section: "system",
  },
  {
    key: "launchctl",
    path: "/dashboard/launchctl",
    icon: Server,
    title: "Launchctl",
    section: "system",
  },
  {
    key: "settings",
    path: "/dashboard/settings",
    icon: SettingsIcon,
    title: "Settings",
    section: "system",
    locked: true,
  },
  {
    key: "cloud",
    path: "https://app.openbase.cloud",
    icon: Cloud,
    title: "Cloud",
    section: "system",
    externalUrl: "https://app.openbase.cloud",
  },
];

export function readHiddenSidebarItems(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SIDEBAR_HIDDEN_ITEMS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function writeHiddenSidebarItems(keys: string[]) {
  if (typeof window === "undefined") return;
  const lockedKeys = new Set(
    BUILT_IN_SIDEBAR_ITEMS.filter((item) => item.locked).map((item) => item.key),
  );
  const normalized = [...new Set(keys)]
    .filter((key) => !lockedKeys.has(key))
    .sort();
  window.localStorage.setItem(
    SIDEBAR_HIDDEN_ITEMS_STORAGE_KEY,
    JSON.stringify(normalized),
  );
  window.dispatchEvent(
    new CustomEvent(SIDEBAR_PREFERENCES_EVENT, { detail: normalized }),
  );
}

export function sidebarItemVisible(item: { key: string; locked?: boolean }, hiddenKeys: string[]) {
  return item.locked || !hiddenKeys.includes(item.key);
}
