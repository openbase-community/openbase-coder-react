import { navigationTitle } from "./app-navigation";
import { projectName } from "./project-display";
import { BUILT_IN_SIDEBAR_ITEMS } from "./sidebar-preferences";

export type WorkspaceTabTarget = { path: string; title: string };

export function workspaceTabTitle(path: string): string {
  const [pathname, search] = path.split("?");
  const params = new URLSearchParams(search);
  const report = params.get("report");
  if (report) return report.split("/").pop() || "Report";
  if (pathname === "/dashboard/project") {
    return projectName(params.get("path") || "") || "Project";
  }
  const item = BUILT_IN_SIDEBAR_ITEMS.find((item) => item.path === pathname);
  if (item) return navigationTitle(item);
  return pathname.startsWith("/dashboard/threads/") ? "Thread" : "Openbase";
}

export function projectTabTarget(path: string): WorkspaceTabTarget {
  return {
    path: `/dashboard/project?${new URLSearchParams({ path })}`,
    title: projectName(path),
  };
}

export function reportTabTarget(
  project: string,
  report: string,
  title: string,
): WorkspaceTabTarget {
  return {
    path: `/dashboard/reports?${new URLSearchParams({ project, report })}`,
    title,
  };
}
