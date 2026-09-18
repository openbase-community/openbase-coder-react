// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { THREAD_LIST_REFRESH_INTERVAL_MS } from "@/lib/polling";
import { useProjectsAndThreads } from "./useProjectsAndThreads";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe.each(["threads", "projects"] as const)("%s pagination", (kind) => {
  const endpoint =
    kind === "threads" ? "/api/threads/" : "/api/projects/recent/";
  const nextKey = kind === "threads" ? "nextThreadsUrl" : "nextProjectsUrl";
  const moreKey = kind === "threads" ? "loadMoreThreads" : "loadMoreProjects";
  let result: { current: ReturnType<typeof useProjectsAndThreads> };
  let rerender: (props: { loadAllThreads: boolean }) => void;
  let items: { thread_id: string; path: string; name: string }[];
  let blockedPage: number | null;
  let releasePage: () => void;
  let failedPage: number | null;

  beforeEach(async () => {
    vi.useFakeTimers();
    blockedPage = failedPage = null;
    items = Array.from({ length: 75 }, (_, i) => ({
      thread_id: `${i}`,
      path: `/projects/${i}`,
      name: `Item ${i}`,
    }));
    vi.mocked(apiFetch).mockImplementation(async (input) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname !== endpoint) return Response.json({});
      const page = Number(url.searchParams.get("page") ?? 1);
      if (page === failedPage) throw new Error("Page unavailable");
      const response = Response.json({
        [kind]: items.slice((page - 1) * 25, page * 25),
        count: items.length,
        page,
        page_size: 25,
        next:
          page * 25 < items.length
            ? `${endpoint}?page=${page + 1}&page_size=25`
            : null,
      });
      if (page === blockedPage) {
        blockedPage = null;
        await new Promise<void>((resolve) => {
          releasePage = resolve;
        });
      }
      return response;
    });
    await act(async () => {
      ({ result, rerender } = renderHook(
        (props) => useProjectsAndThreads(props),
        { initialProps: { loadAllThreads: false } },
      ));
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const refresh = () =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(THREAD_LIST_REFRESH_INTERVAL_MS);
    });

  const loadMore = () =>
    act(async () => {
      await result.current[moreKey]();
    });

  it.skipIf(kind !== "threads")("loads every page for filters without scrolling, including after polling", async () => {
    expect(result.current.threads).toHaveLength(25);
    await act(async () => rerender({ loadAllThreads: true }));
    expect(result.current.threads).toEqual(items);
    expect(result.current.nextThreadsUrl).toBeNull();

    items.push({ thread_id: "older", path: "/projects/older", name: "Older match" });
    await refresh();
    expect(result.current.threads).toEqual(items);
    expect(result.current.nextThreadsUrl).toBeNull();
  });

  it.skipIf(kind !== "threads")("stops scanning when filters are cleared during a request", async () => {
    blockedPage = 2;
    await act(async () => rerender({ loadAllThreads: true }));
    expect(result.current.loadingMoreThreads).toBe(true);
    await act(async () => {
      rerender({ loadAllThreads: false });
    });
    await act(async () => releasePage());
    expect(result.current.threads).toHaveLength(50);
    expect(result.current.nextThreadsUrl).toBe(`${endpoint}?page=3&page_size=25`);
    expect(result.current.loadingMoreThreads).toBe(false);
  });

  it.skipIf(kind !== "threads")("pauses a failed scan and resumes after a successful refresh", async () => {
    failedPage = 2;
    await act(async () => rerender({ loadAllThreads: true }));
    expect(result.current.threads).toHaveLength(25);
    expect(result.current.error).toBe("Page unavailable");
    expect(result.current.loadingMoreThreads).toBe(false);
    expect(vi.mocked(apiFetch).mock.calls.filter(([url]) => url.includes("page=2"))).toHaveLength(1);

    failedPage = null;
    await refresh();
    expect(result.current.threads).toEqual(items);
    expect(result.current.nextThreadsUrl).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("keeps loaded pages and continues from the next page after polling", async () => {
    await loadMore();
    expect(result.current[kind]).toHaveLength(50);

    await refresh();

    expect(result.current[kind]).toEqual(items.slice(0, 50));
    expect(result.current[nextKey]).toBe(`${endpoint}?page=3&page_size=25`);
    await loadMore();
    expect(result.current[kind]).toEqual(items);
    expect(result.current[nextKey]).toBeNull();
    await refresh();
    expect(result.current[kind]).toEqual(items);
    expect(result.current[nextKey]).toBeNull();
  });

  it("refreshes older items and removes archived items", async () => {
    await loadMore();
    items = items.filter((item) => item.thread_id !== "30");
    items[35] = { ...items[35], name: "Updated" };
    items.unshift({ thread_id: "new", path: "/projects/new", name: "New" });

    await refresh();

    expect(result.current[kind]).toEqual(items.slice(0, 50));
  });

  it("stops at the last page when the list shrinks", async () => {
    await loadMore();
    items = items.slice(0, 10);

    await refresh();

    expect(result.current[kind]).toEqual(items);
    expect(result.current[nextKey]).toBeNull();
  });

  it("does not let interval polling starve a slow refresh", async () => {
    items[0] = { ...items[0], name: "Updated during slow request" };
    blockedPage = 1;
    let pending: Promise<void>;
    await act(async () => {
      pending = result.current.fetchData();
    });
    await refresh();
    await refresh();
    await act(async () => {
      releasePage();
      await pending;
    });
    expect(result.current[kind][0]).toEqual(
      expect.objectContaining({ name: "Updated during slow request" }),
    );
  });

  it("preserves the list and cursor when a later refresh page fails", async () => {
    await loadMore();
    failedPage = 2;

    await refresh();

    expect(result.current[kind]).toEqual(items.slice(0, 50));
    expect(result.current[nextKey]).toBe(`${endpoint}?page=3&page_size=25`);
    expect(result.current.error).toBe("Page unavailable");
    failedPage = null;
    await refresh();
    expect(result.current.error).toBeNull();
  });

  it.skipIf(kind !== "threads").each(["refresh", "load more"])(
    "preserves a saved thread mutation while %s is in flight",
    async (operation) => {
      blockedPage = operation === "refresh" ? 1 : 2;
      let pending: Promise<void>;
      await act(async () => {
        pending =
          operation === "refresh"
            ? result.current.fetchThreads()
            : result.current.loadMoreThreads();
      });
      act(() => result.current.updateThread("0", { tags: ["Manual tag"] }));
      expect(result.current.threads[0].tags).toEqual(["Manual tag"]);
      await act(async () => {
        releasePage();
        await pending;
      });
      expect(result.current.threads[0].tags).toEqual(["Manual tag"]);
      expect(result.current.threads).toHaveLength(
        operation === "refresh" ? 25 : 50,
      );
    },
  );

  it.each(["refresh", "load more"])(
    "handles %s starting first during overlapping requests",
    async (first) => {
      blockedPage = first === "refresh" ? 1 : 2;
      await act(async () => {
        const pending =
          first === "refresh"
            ? result.current.fetchData()
            : result.current[moreKey]();
        await (first === "refresh"
          ? result.current[moreKey]()
          : result.current.fetchData());
        releasePage();
        await pending;
      });

      expect(result.current[kind]).toEqual(items.slice(0, 50));
      expect(result.current[nextKey]).toBe(`${endpoint}?page=3&page_size=25`);
    },
  );
});

describe("worktree status enrichment", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("polls statuses for worktree paths and merges them into the nested tree", async () => {
    const statusRequests: string[][] = [];
    vi.mocked(apiFetch).mockImplementation(async (input) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/projects/recent/") {
        return Response.json({
          projects: [
            {
              path: "/ws",
              worktrees: [{ path: "/ws-worktrees/a", source: "worktree" }],
            },
          ],
          count: 1,
          page: 1,
          page_size: 25,
          next: null,
        });
      }
      if (url.pathname === "/api/projects/status/") {
        statusRequests.push(url.searchParams.getAll("path"));
        return Response.json({
          projects: [
            { path: "/ws", git_status: "clean" },
            { path: "/ws-worktrees/a", git_status: "dirty" },
          ],
        });
      }
      return Response.json({});
    });

    let result: { current: ReturnType<typeof useProjectsAndThreads> };
    await act(async () => {
      ({ result } = renderHook(() => useProjectsAndThreads()));
    });

    expect(statusRequests[0]).toEqual(["/ws", "/ws-worktrees/a"]);
    const project = result!.current.projects[0];
    expect(project.git_status).toBe("clean");
    expect(project.worktrees?.[0]?.git_status).toBe("dirty");
    expect(project.worktrees?.[0]?.source).toBe("worktree");
  });
});
