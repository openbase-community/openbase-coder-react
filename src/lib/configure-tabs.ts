import {
  Brain,
  CalendarClock,
  type LucideIcon,
  PackageOpen,
  Zap,
} from "lucide-react";

/**
 * The four destinations grouped under the "Configure" sidebar entry. Each
 * keeps its own route (deep links and workspace tabs are unchanged); the
 * pages render a shared tab strip to move between them.
 */
export type ConfigureTab = {
  key: "loops" | "skills" | "memories" | "templates";
  path: string;
  icon: LucideIcon;
  title: string;
};

export const CONFIGURE_TABS: readonly ConfigureTab[] = [
  { key: "loops", path: "/dashboard/loops", icon: CalendarClock, title: "Loops" },
  { key: "skills", path: "/dashboard/skills", icon: Zap, title: "Skills" },
  { key: "memories", path: "/dashboard/memories", icon: Brain, title: "Memories" },
  {
    key: "templates",
    path: "/dashboard/boilersync",
    icon: PackageOpen,
    title: "Templates",
  },
];

/** Default landing tab when the sidebar entry is clicked. */
export const CONFIGURE_DEFAULT_PATH = CONFIGURE_TABS[0].path;

export function configureTabForPath(pathname: string): ConfigureTab | undefined {
  return CONFIGURE_TABS.find(
    (tab) => pathname === tab.path || pathname.startsWith(`${tab.path}/`),
  );
}
