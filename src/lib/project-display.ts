import type { GitStatus, Project, ThreadInfo } from "@/types/session";

export type GitStyle = { dot: string; label: string; text: string };

export const GIT_STATUS: Record<GitStatus, GitStyle> = {
  clean: { dot: "bg-success", label: "clean", text: "text-success" },
  dirty: { dot: "bg-warning", label: "dirty", text: "text-warning" },
  unpushed: { dot: "bg-info", label: "unpushed", text: "text-info" },
  no_git: {
    dot: "bg-muted-foreground/40",
    label: "no git",
    text: "text-muted-foreground",
  },
};

export const projectName = (path: string) => path.split("/").pop() || path;

export const fetchProjectsAndThreads = async (
  fetcher: (input: string) => Promise<Response>,
) => {
  const [projRes, sessRes] = await Promise.all([
    fetcher("/api/projects/recent/"),
    fetcher("/api/threads/"),
  ]);

  const projects: Project[] = projRes.ok
    ? ((await projRes.json()).projects ?? [])
    : [];
  const threads: ThreadInfo[] = sessRes.ok
    ? ((await sessRes.json()).threads ?? [])
    : [];

  return { projects, threads };
};
