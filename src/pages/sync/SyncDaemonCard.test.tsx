// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { SyncDaemonCard } from "./SyncDaemonCard";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const fetchMock = vi.mocked(apiFetch);

const jsonResponse = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

beforeEach(() => {
  fetchMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("shows an initial loading state while daemon settings are pending", () => {
  fetchMock.mockReturnValue(new Promise(() => {}));

  render(<SyncDaemonCard />);

  expect(screen.getByText("Loading Openbase Sync...")).toBeTruthy();
});

it("shows settings load failures instead of disappearing", async () => {
  fetchMock.mockResolvedValueOnce(
    jsonResponse({ error: "settings unavailable" }, { status: 503 }),
  );

  render(<SyncDaemonCard />);

  expect(await screen.findByText("settings unavailable")).toBeTruthy();
});

it("clears stale daemon data when a configured daemon becomes unreachable", async () => {
  vi.useFakeTimers();
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ configured: true, role: "edge", roots: [] }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        device: "laptop",
        role: "edge",
        uptime_s: 1,
        roots: [],
        peers: [{ device: "mini", role: "hub", rtt_ms: 2, roots: {} }],
        open_conflicts: 1,
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        conflicts: [
          {
            id: 7,
            root: "projects",
            path: "a.txt",
            kind: "content",
            a_device: "laptop",
            b_device: "mini",
            created_ns: 1,
          },
        ],
      }),
    );

  render(<SyncDaemonCard />);
  await vi.waitFor(() => expect(screen.getByText("a.txt")).toBeTruthy());

  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ configured: true, role: "edge", roots: [] }),
    )
    .mockResolvedValueOnce(
      jsonResponse({ error: "down" }, { status: 503 }),
    )
    .mockResolvedValueOnce(jsonResponse({ conflicts: [] }));

  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  await vi.waitFor(() =>
    expect(screen.getByText("daemon not answering")).toBeTruthy(),
  );
  expect(screen.queryByText("a.txt")).toBeNull();
});
