import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { THREAD_LIST_REFRESH_INTERVAL_MS } from "@/lib/polling";
import {
  fetchProjectPage,
  fetchProjectStatuses,
  fetchThreadPage,
} from "@/lib/project-display";
import type { Project, ThreadInfo } from "@/types/session";

export const useProjectsAndThreads = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [totalThreadCount, setTotalThreadCount] = useState(0);
  const [totalProjectCount, setTotalProjectCount] = useState(0);
  const [nextThreadsUrl, setNextThreadsUrl] = useState<string | null>(null);
  const [nextProjectsUrl, setNextProjectsUrl] = useState<string | null>(null);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [loadingMoreThreads, setLoadingMoreThreads] = useState(false);
  const [loadingMoreProjects, setLoadingMoreProjects] = useState(false);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const threadPagination = useRef({ pages: 1, request: 0, loadingMore: false });
  const projectPagination = useRef({ pages: 1, request: 0, loadingMore: false });

  const toErrorMessage = (err: unknown) =>
    err instanceof Error ? err.message : "Unable to reach the local API.";

  const mergeProjectUpdates = useCallback((updates: Project[]) => {
    if (updates.length === 0) return;
    setProjects((current) => {
      const byPath = new Map(updates.map((project) => [project.path, project]));
      return current.map((project) => ({
        ...project,
        ...(byPath.get(project.path) ?? {}),
        worktrees: project.worktrees?.map((worktree) => ({
          ...worktree,
          ...(byPath.get(worktree.path) ?? {}),
        })),
      }));
    });
  }, []);

  const refreshProjectStatuses = useCallback(
    async (items: Project[]) => {
      // Best-effort enrichment of git status dots: a failure leaves statuses
      // as "checking" instead of erroring the whole page.
      try {
        const updates = await fetchProjectStatuses(
          apiFetch,
          items.flatMap((project) => [
            project.path,
            ...(project.worktrees ?? []).map((worktree) => worktree.path),
          ]),
        );
        mergeProjectUpdates(updates);
      } catch {
        // Silent by design; see above.
      }
    },
    [mergeProjectUpdates],
  );

  const fetchThreads = useCallback(async () => {
    const pagination = threadPagination.current;
    if (pagination.loadingMore) return;
    const request = ++pagination.request;
    try {
      let page = await fetchThreadPage(apiFetch);
      const items = [...page.threads];
      let pages = 1;
      while (
        page.next &&
        pages < pagination.pages &&
        request === pagination.request
      ) {
        page = await fetchThreadPage(apiFetch, page.next);
        items.push(...page.threads);
        pages += 1;
      }
      if (request !== pagination.request) return;
      pagination.pages = pages;
      setThreads([
        ...new Map(items.map((thread) => [thread.thread_id, thread])).values(),
      ]);
      setTotalThreadCount(page.count);
      setNextThreadsUrl(page.next);
      setThreadsError(null);
    } catch (err) {
      // Runs on an interval, so surface via a persistent inline error state.
      if (request === pagination.request) setThreadsError(toErrorMessage(err));
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    const pagination = projectPagination.current;
    if (pagination.loadingMore) return;
    const request = ++pagination.request;
    try {
      let page = await fetchProjectPage(apiFetch);
      const items = [...page.projects];
      let pages = 1;
      while (
        page.next &&
        pages < pagination.pages &&
        request === pagination.request
      ) {
        page = await fetchProjectPage(apiFetch, page.next);
        items.push(...page.projects);
        pages += 1;
      }
      if (request !== pagination.request) return;
      pagination.pages = pages;
      const projects = [
        ...new Map(items.map((project) => [project.path, project])).values(),
      ];
      setProjects(projects);
      setTotalProjectCount(page.count);
      setNextProjectsUrl(page.next);
      setProjectsError(null);
      void refreshProjectStatuses(projects);
    } catch (err) {
      if (request === pagination.request) setProjectsError(toErrorMessage(err));
    } finally {
      setProjectsLoading(false);
    }
  }, [refreshProjectStatuses]);

  const fetchData = useCallback(async () => {
    await Promise.all([fetchThreads(), fetchProjects()]);
  }, [fetchProjects, fetchThreads]);

  const loadMoreThreads = useCallback(async () => {
    const pagination = threadPagination.current;
    if (!nextThreadsUrl || pagination.loadingMore) return;

    pagination.loadingMore = true;
    pagination.request += 1;
    setLoadingMoreThreads(true);
    try {
      const page = await fetchThreadPage(apiFetch, nextThreadsUrl);
      pagination.pages += 1;
      setThreads((current) => {
        const seen = new Set(current.map((thread) => thread.thread_id));
        return [
          ...current,
          ...page.threads.filter((thread) => !seen.has(thread.thread_id)),
        ];
      });
      setTotalThreadCount(page.count);
      setNextThreadsUrl(page.next);
    } catch (err) {
      toast.error(toErrorMessage(err));
    } finally {
      pagination.loadingMore = false;
      setLoadingMoreThreads(false);
    }
  }, [nextThreadsUrl]);

  const loadMoreProjects = useCallback(async () => {
    const pagination = projectPagination.current;
    if (!nextProjectsUrl || pagination.loadingMore) return;

    pagination.loadingMore = true;
    pagination.request += 1;
    setLoadingMoreProjects(true);
    try {
      const page = await fetchProjectPage(apiFetch, nextProjectsUrl);
      pagination.pages += 1;
      setProjects((current) => {
        const seen = new Set(current.map((project) => project.path));
        return [
          ...current,
          ...page.projects.filter((project) => !seen.has(project.path)),
        ];
      });
      setTotalProjectCount(page.count);
      setNextProjectsUrl(page.next);
      void refreshProjectStatuses(page.projects);
    } catch (err) {
      toast.error(toErrorMessage(err));
    } finally {
      pagination.loadingMore = false;
      setLoadingMoreProjects(false);
    }
  }, [nextProjectsUrl, refreshProjectStatuses]);

  useEffect(() => {
    void fetchData();
    const interval = window.setInterval(
      fetchData,
      THREAD_LIST_REFRESH_INTERVAL_MS,
    );
    return () => window.clearInterval(interval);
  }, [fetchData]);

  return {
    projects,
    threads,
    totalThreadCount,
    totalProjectCount,
    nextThreadsUrl,
    nextProjectsUrl,
    error: threadsError ?? projectsError,
    loading: threadsLoading,
    threadsLoading,
    projectsLoading,
    loadingMoreThreads,
    loadingMoreProjects,
    fetchData,
    fetchThreads,
    fetchProjects,
    loadMoreThreads,
    loadMoreProjects,
  };
};
