// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { describeHealth } from "./syncHealth";
import { SyncHeldDeletes } from "./SyncHeldDeletes";
import type { SyncOverview } from "./syncTypes";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const fetchMock = vi.mocked(apiFetch);

beforeEach(() => fetchMock.mockReset());
afterEach(() => cleanup());

const data = {
  roots: [
    {
      id: "projects",
      path: "/Users/x/Projects",
      count: 7,
      sample: ["app/a.py", "app/b.py", "app/c.py", "app/d.py", "app/e.py", "app/f.py"],
    },
  ],
};

it("renders nothing while no deletion is held", () => {
  const { container } = render(<SyncHeldDeletes data={{ roots: [] }} onChanged={vi.fn()} />);
  expect(container.firstChild).toBeNull();
});

it("lists a folder's held deletions and releases them after confirming", async () => {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ root: "projects", action: "release", count: 7 }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  const onChanged = vi.fn();
  render(
    <SyncHeldDeletes
      data={data}
      onChanged={onChanged}
      displayPath={(path) => path.replace("/Users/x", "~")}
    />,
  );
  expect(screen.getByText("~/Projects")).toBeTruthy();
  expect(screen.getByText(/7 held/)).toBeTruthy();
  expect(screen.getByText("app/e.py")).toBeTruthy();
  expect(screen.queryByText("app/f.py")).toBeNull();
  expect(screen.getByText(/and 2 more/)).toBeTruthy();

  fireEvent.click(screen.getByText("Release deletions"));
  fireEvent.click(await screen.findByText("Release"));

  await waitFor(() => expect(onChanged).toHaveBeenCalled());
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/sync/daemon/held-deletes/");
  expect(JSON.parse(String(init?.body))).toEqual({ root: "projects", action: "release" });
});

it("puts held deletions in the health banner", () => {
  const overview: SyncOverview = {
    state: "in_sync",
    role: "edge",
    device: "laptop",
    peers_connected: 1,
    offline_peers: [],
    totals: { unsent: 0, unacked: 0, pending_fetches: 0, entries: 10 },
    roots: [],
    attention: {
      conflicts: 0,
      stale_locks: 0,
      held_deletes: [{ id: "projects", path: "/Users/x/Projects", count: 3 }],
      needed: true,
    },
  };
  const health = describeHealth({ overview, unreachable: false, hubLabel: null, progress: null });
  expect(health.tone).toBe("warn");
  expect(health.title).toBe("Needs attention: 3 held deletions to confirm");
});
