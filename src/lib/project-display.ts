import type {
  GitStatus,
  Project,
  ProjectListResponse,
  ThreadInfo,
  ThreadListResponse,
} from "@/types/session";

export type GitStyle = { dot: string; label: string; text: string };

export const GIT_STATUS: Record<GitStatus, GitStyle> = {
  clean: { dot: "bg-success", label: "clean", text: "text-success" },
  dirty: { dot: "bg-warning", label: "dirty", text: "text-warning" },
  "out-of-sync": {
    dot: "bg-info",
    label: "out of sync",
    text: "text-info",
  },
  no_git: {
    dot: "bg-muted-foreground/40",
    label: "no git",
    text: "text-muted-foreground",
  },
  missing: {
    dot: "bg-destructive",
    label: "missing",
    text: "text-destructive",
  },
  unknown: {
    dot: "bg-muted-foreground/30",
    label: "checking",
    text: "text-muted-foreground",
  },
};

export const projectName = (path: string) => path.split("/").pop() || path;

export const THREAD_PAGE_SIZE = 25;
export const LARGE_THREAD_PAGE_SIZE = 100;
export const PROJECT_PAGE_SIZE = 25;

export const fetchThreadPage = async (
  fetcher: (input: string) => Promise<Response>,
  path = `/api/threads/?page_size=${THREAD_PAGE_SIZE}`,
): Promise<ThreadListResponse> => {
  const response = await fetcher(path);
  if (!response.ok) {
    return {
      threads: [],
      count: 0,
      page: 1,
      page_size: THREAD_PAGE_SIZE,
      next: null,
      previous: null,
    };
  }

  const data = await response.json();
  const threads: ThreadInfo[] = data.threads ?? [];
  return {
    threads,
    count: typeof data.count === "number" ? data.count : threads.length,
    page: typeof data.page === "number" ? data.page : 1,
    page_size:
      typeof data.page_size === "number" ? data.page_size : threads.length,
    next: typeof data.next === "string" ? data.next : null,
    previous: typeof data.previous === "string" ? data.previous : null,
  };
};

export const fetchProjectPage = async (
  fetcher: (input: string) => Promise<Response>,
  path = `/api/projects/recent/?page_size=${PROJECT_PAGE_SIZE}`,
): Promise<ProjectListResponse> => {
  const response = await fetcher(path);
  if (!response.ok) {
    return {
      projects: [],
      count: 0,
      page: 1,
      page_size: PROJECT_PAGE_SIZE,
      next: null,
      previous: null,
    };
  }

  const data = await response.json();
  const projects: Project[] = data.projects ?? [];
  return {
    projects,
    count: typeof data.count === "number" ? data.count : projects.length,
    page: typeof data.page === "number" ? data.page : 1,
    page_size:
      typeof data.page_size === "number" ? data.page_size : projects.length,
    next: typeof data.next === "string" ? data.next : null,
    previous: typeof data.previous === "string" ? data.previous : null,
  };
};

export const fetchProjectStatuses = async (
  fetcher: (input: string) => Promise<Response>,
  paths: string[],
): Promise<Project[]> => {
  if (paths.length === 0) return [];
  const params = new URLSearchParams();
  paths.forEach((path) => params.append("path", path));
  const response = await fetcher(`/api/projects/status/?${params}`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.projects ?? [];
};

export const fetchAllProjectPages = async (
  fetcher: (input: string) => Promise<Response>,
): Promise<Project[]> => {
  const projects: Project[] = [];
  let next: string | null = `/api/projects/recent/?page_size=100`;
  while (next) {
    const page = await fetchProjectPage(fetcher, next);
    projects.push(...page.projects);
    next = page.next;
  }
  return projects;
};

export const fetchProjectsAndThreads = async (
  fetcher: (input: string) => Promise<Response>,
) => {
  const [projectsPage, sessRes] = await Promise.all([
    fetchProjectPage(fetcher),
    fetchThreadPage(fetcher),
  ]);

  return { projectsPage, threadsPage: sessRes };
};
