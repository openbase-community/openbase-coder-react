import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
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
  let result: ReturnType<typeof useProjectsAndThreads>;
  let renderer: ReactTestRenderer;
  let items: { thread_id: string; path: string; name: string }[];
  let blockedPage: number | null;
  let releasePage: () => void;
  let failedPage: number | null;

  function Harness() {
    result = useProjectsAndThreads();
    return null;
  }

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setInterval, clearInterval });
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
      renderer = create(createElement(Harness));
    });
  });

  afterEach(() => {
    act(() => renderer.unmount());
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  const refresh = () =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(THREAD_LIST_REFRESH_INTERVAL_MS);
    });

  const loadMore = () =>
    act(async () => {
      await result[moreKey]();
    });

  it("keeps loaded pages and continues from the next page after polling", async () => {
    await loadMore();
    expect(result[kind]).toHaveLength(50);

    await refresh();

    expect(result[kind]).toEqual(items.slice(0, 50));
    expect(result[nextKey]).toBe(`${endpoint}?page=3&page_size=25`);
    await loadMore();
    expect(result[kind]).toEqual(items);
    expect(result[nextKey]).toBeNull();
    await refresh();
    expect(result[kind]).toEqual(items);
    expect(result[nextKey]).toBeNull();
  });

  it("refreshes older items and removes archived items", async () => {
    await loadMore();
    items = items.filter((item) => item.thread_id !== "30");
    items[35] = { ...items[35], name: "Updated" };
    items.unshift({ thread_id: "new", path: "/projects/new", name: "New" });

    await refresh();

    expect(result[kind]).toEqual(items.slice(0, 50));
  });

  it("stops at the last page when the list shrinks", async () => {
    await loadMore();
    items = items.slice(0, 10);

    await refresh();

    expect(result[kind]).toEqual(items);
    expect(result[nextKey]).toBeNull();
  });

  it("preserves the list and cursor when a later refresh page fails", async () => {
    await loadMore();
    failedPage = 2;

    await refresh();

    expect(result[kind]).toEqual(items.slice(0, 50));
    expect(result[nextKey]).toBe(`${endpoint}?page=3&page_size=25`);
    expect(result.error).toBe("Page unavailable");
    failedPage = null;
    await refresh();
    expect(result.error).toBeNull();
  });

  it.each(["refresh", "load more"])(
    "handles %s starting first during overlapping requests",
    async (first) => {
      blockedPage = first === "refresh" ? 1 : 2;
      await act(async () => {
        const pending =
          first === "refresh" ? result.fetchData() : result[moreKey]();
        await (first === "refresh" ? result[moreKey]() : result.fetchData());
        releasePage();
        await pending;
      });

      expect(result[kind]).toEqual(items.slice(0, 50));
      expect(result[nextKey]).toBe(`${endpoint}?page=3&page_size=25`);
    },
  );
});
