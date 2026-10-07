// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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

const edgeSettings = {
  configured: true,
  reachable: true,
  role: "edge",
  hub_is_self: false,
  hub_name: "mini",
  hub_host: "mini.net.example",
  roots: [
    { id: "projects", path: "~/Projects" },
    { id: "openbase-thread-sync", path: "~/.openbase/thread-sync" },
  ],
};

const edgeStatus = {
  device: "laptop",
  role: "edge",
  uptime_s: 1,
  roots: [
    {
      id: "projects",
      path: "~/Projects",
      entries: 1200,
      seq: 1,
      pending_fetches: 0,
      scanning: false,
    },
  ],
  peers: [{ device: "mini", role: "hub", rtt_ms: 2, roots: {} }],
  open_conflicts: 0,
};

const routeConfigured = (settings: unknown) =>
  fetchMock.mockImplementation(async (url, init) => {
    const path = String(url);
    if (init?.method && init.method !== "GET") {
      return jsonResponse({ peers: [{ name: "mini", ok: true, error: null }] });
    }
    if (path === "/api/sync/daemon/settings/") return jsonResponse(settings);
    if (path === "/api/sync/daemon/status/") return jsonResponse(edgeStatus);
    if (path === "/api/sync/daemon/conflicts/") {
      return jsonResponse({ conflicts: [] });
    }
    return jsonResponse({}, { status: 404 });
  });

const mutations = () =>
  fetchMock.mock.calls.filter(
    ([, init]) => init?.method && init.method !== "GET",
  );

it("shows the unconfigured pairing flow instead of a CLI hint", async () => {
  fetchMock.mockImplementation(async (url) =>
    String(url).includes("/pairing/candidates/")
      ? jsonResponse({ signed_in: true, role: "none", candidates: [] })
      : jsonResponse({ configured: false, roots: [] }),
  );

  render(<SyncDaemonCard />);

  expect(await screen.findByText("not syncing")).toBeTruthy();
  expect(screen.queryByText(/sync-daemon configure/)).toBeNull();
  expect(screen.getByText("Make this my always-on computer")).toBeTruthy();
});

it("names the hub and lists the synced folders on an edge", async () => {
  routeConfigured(edgeSettings);

  render(<SyncDaemonCard />);

  expect(
    await screen.findByText("Syncing with mini, your always-on computer."),
  ).toBeTruthy();
  expect(screen.getByText("~/Projects")).toBeTruthy();
  expect(screen.getByText("~/.openbase/thread-sync")).toBeTruthy();
  await waitFor(() => expect(screen.getByText(/1,200 entries/)).toBeTruthy());
  expect(screen.getByText("Stop syncing on this computer")).toBeTruthy();
});

it("says so on the hub itself", async () => {
  routeConfigured({ ...edgeSettings, role: "hub", hub_is_self: true });

  render(<SyncDaemonCard />);

  expect(
    await screen.findByText(
      "This is your always-on computer. Your other computers sync with it.",
    ),
  ).toBeTruthy();
});

it("adds and removes folders", async () => {
  routeConfigured(edgeSettings);
  render(<SyncDaemonCard />);
  await screen.findByText("~/Projects");

  fireEvent.change(screen.getByLabelText("Folder to sync"), {
    target: { value: "~/Documents" },
  });
  fireEvent.click(screen.getByText("Add folder"));
  await waitFor(() => expect(mutations()).toHaveLength(1));
  const [addUrl, addInit] = mutations()[0];
  expect(addUrl).toBe("/api/sync/daemon/roots/");
  expect(addInit?.method).toBe("POST");
  expect(JSON.parse(String(addInit?.body))).toEqual({ path: "~/Documents" });

  fireEvent.click(screen.getByLabelText("Stop syncing ~/.openbase/thread-sync"));
  await waitFor(() => expect(mutations()).toHaveLength(2));
  const [, removeInit] = mutations()[1];
  expect(removeInit?.method).toBe("DELETE");
  expect(JSON.parse(String(removeInit?.body))).toEqual({
    path: "~/.openbase/thread-sync",
  });
});

it("stops syncing only after confirmation", async () => {
  routeConfigured(edgeSettings);
  render(<SyncDaemonCard />);

  fireEvent.click(await screen.findByText("Stop syncing on this computer"));
  expect(mutations()).toHaveLength(0);
  expect(screen.getByText("Stop syncing on this computer?")).toBeTruthy();

  fireEvent.click(screen.getByText("Stop syncing"));

  await waitFor(() => expect(mutations()).toHaveLength(1));
  expect(mutations()[0][0]).toBe("/api/sync/daemon/pairing/leave/");
});
