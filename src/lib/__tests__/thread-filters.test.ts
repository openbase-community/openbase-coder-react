import { describe, expect, it } from "vitest";

import { filterThreads } from "../thread-filters";
import type { ThreadInfo, ThreadStatus } from "../../types/session";

const thread = (
  threadId: string,
  overrides: Partial<ThreadInfo> = {},
): ThreadInfo => ({
  thread_id: threadId,
  directory: "/projects/openbase",
  display_name: "Openbase work",
  created_at: "2026-09-10T00:00:00.000Z",
  updated_at: "2026-09-10T00:00:00.000Z",
  current_turn: null,
  turn_history: [],
  status: "idle" as ThreadStatus,
  ...overrides,
});

describe("filterThreads", () => {
  it("filters by selected tags case-insensitively", () => {
    const threads = [
      thread("a", { tags: ["Openbase", "Security"] }),
      thread("b", { tags: ["Openbase"] }),
      thread("c", { tags: ["Marketing"] }),
    ];

    expect(
      filterThreads(threads, { search: "", tags: ["openbase", "security"] }),
    ).toEqual([threads[0]]);
  });

  it("searches names, project paths, status, and tags", () => {
    const threads = [
      thread("a", { display_name: "Fix notifications", tags: ["Mobile"] }),
      thread("b", {
        directory: "/projects/mindful-makers",
        display_name: "Follow up",
        tags: ["Outreach"],
      }),
      thread("c", { display_name: "Docs", status: "running" }),
    ];

    expect(filterThreads(threads, { search: "notification", tags: [] })).toEqual([
      threads[0],
    ]);
    expect(filterThreads(threads, { search: "mindful", tags: [] })).toEqual([
      threads[1],
    ]);
    expect(filterThreads(threads, { search: "outreach", tags: [] })).toEqual([
      threads[1],
    ]);
    expect(filterThreads(threads, { search: "running", tags: [] })).toEqual([
      threads[2],
    ]);
  });
});
