// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { SyncDaemonCard } from "./SyncDaemonCard";
import { GROUPS_PER_PAGE } from "./SyncConflicts";

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
      path: "/Users/x/Projects",
      entries: 1200,
      seq: 1,
      pending_fetches: 0,
      scanning: false,
    },
  ],
  peers: [
    {
      device: "gabes-mac-mini",
      role: "hub",
      rtt_ms: 2,
      roots: { projects: { sent_seq: 1, acked_seq: 1, applied_peer_seq: 4 } },
    },
  ],
  open_conflicts: 0,
};

const syncingStatus = {
  ...edgeStatus,
  roots: [{ ...edgeStatus.roots[0], seq: 950_000 }],
  peers: [
    {
      device: "gabes-mac-mini",
      role: "hub",
      rtt_ms: 50,
      roots: {
        projects: {
          sent_seq: 863_000,
          acked_seq: 859_000,
          applied_peer_seq: 613_000,
        },
      },
    },
  ],
  open_conflicts: 3,
};

const fileConflict = (id: number, path: string, group: string) => ({
  id,
  root: "projects",
  path,
  kind: "content",
  a_hash: "a".repeat(64),
  b_hash: "b".repeat(64),
  ancestor: "",
  a_device: "laptop",
  b_device: "gabes-mac-mini",
  created_ns: 1_791_354_299_158_718_000,
  label: "",
  root_path: "/Users/x/Projects",
  repo: group,
  ref: "",
  group,
  a_is_local: true,
});

const branchConflict = {
  ...fileConflict(3, "ws/cli:refs/heads/staging", "ws/cli"),
  kind: "git-branch",
  a_hash: "1".repeat(40),
  b_hash: "2".repeat(40),
  ref: "refs/heads/staging",
};

type Routes = {
  settings?: unknown;
  status?: unknown;
  statusCode?: number;
  conflicts?: unknown[] | null;
  staleLocks?: unknown;
  detail?: Record<number, unknown>;
  post?: (path: string, body: unknown) => Response;
  available?: unknown;
};

const route = (routes: Routes) =>
  fetchMock.mockImplementation(async (url, init) => {
    const path = String(url);
    if (init?.method && init.method !== "GET") {
      if (routes.post) return routes.post(path, JSON.parse(String(init.body)));
      return jsonResponse({ peers: [{ name: "mini", ok: true, error: null }] });
    }
    if (path === "/api/sync/daemon/settings/") {
      return jsonResponse(routes.settings ?? edgeSettings);
    }
    if (path === "/api/sync/daemon/status/") {
      return routes.statusCode && routes.statusCode >= 400
        ? jsonResponse({ error: "down" }, { status: routes.statusCode })
        : jsonResponse(routes.status ?? edgeStatus);
    }
    if (path === "/api/sync/daemon/roots/available/") {
      return routes.available
        ? jsonResponse(routes.available)
        : jsonResponse({ error: "offline" }, { status: 502 });
    }
    if (path === "/api/sync/daemon/conflicts/") {
      return jsonResponse({ conflicts: routes.conflicts ?? [] });
    }
    if (path.startsWith("/api/sync/daemon/stale-locks/")) {
      return jsonResponse(
        routes.staleLocks ?? {
          locks: [],
          checked_at: null,
          refreshing: false,
          error: null,
          stale_after_s: 600,
        },
      );
    }
    const detail = path.match(/^\/api\/sync\/daemon\/conflicts\/(\d+)\/$/);
    if (detail && routes.detail?.[Number(detail[1])]) {
      return jsonResponse(routes.detail[Number(detail[1])]);
    }
    return jsonResponse({}, { status: 404 });
  });

const mutations = () =>
  fetchMock.mock.calls.filter(
    ([, init]) => init?.method && init.method !== "GET",
  );

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

it("says the daemon is not running and clears stale data", async () => {
  vi.useFakeTimers();
  route({ conflicts: [fileConflict(7, "a.txt", "")] });

  render(<SyncDaemonCard />);
  await vi.waitFor(() => expect(screen.getByText("a.txt")).toBeTruthy());

  route({ statusCode: 503 });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  await vi.waitFor(() =>
    expect(screen.getByText("Openbase Sync is not running")).toBeTruthy(),
  );
  expect(screen.getByText("daemon not answering")).toBeTruthy();
  expect(screen.queryByText("a.txt")).toBeNull();
});

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
  route({});

  render(<SyncDaemonCard />);

  expect(
    await screen.findByText("Syncing with mini, your always-on computer."),
  ).toBeTruthy();
  expect(screen.getByText("~/Projects")).toBeTruthy();
  expect(screen.getByText("~/.openbase/thread-sync")).toBeTruthy();
  expect(await screen.findByText("Up to date")).toBeTruthy();
  expect(screen.getByText("1,200 entries in sync.")).toBeTruthy();
  expect(screen.getAllByText(/1,200 entries/)).toHaveLength(2);
  // the hub's device id is shown by its name
  expect(screen.getAllByText("mini").length).toBeGreaterThan(0);
  expect(screen.getByText("Stop syncing on this computer")).toBeTruthy();
});

it("shows the backlog per folder and what needs the user", async () => {
  route({
    status: {
      ...syncingStatus,
      overview: undefined,
    },
    conflicts: [
      fileConflict(1, "ws/cli/pkg/_version.py", "ws/cli"),
      fileConflict(2, "notes/today.md", "notes"),
      branchConflict,
    ],
    staleLocks: {
      locks: [
        {
          repo: "/Users/x/Projects/ws/api",
          path: "/Users/x/Projects/ws/api/.git/index.lock",
          name: "index.lock",
          exists: true,
          age_s: 3600,
          modified: null,
        },
      ],
      checked_at: null,
      refreshing: false,
      error: null,
      stale_after_s: 600,
    },
  });

  render(<SyncDaemonCard />);

  const banner = await screen.findByRole("status", { name: "Sync status" });
  await waitFor(() =>
    expect(
      within(banner).getByText(
        "87,000 changes waiting to send · 4,000 awaiting confirmation.",
      ),
    ).toBeTruthy(),
  );
  await waitFor(() =>
    expect(
      within(banner).getByText(
        "Needs you: 3 conflicts and 1 stale git lock.",
      ),
    ).toBeTruthy(),
  );
  expect(
    screen.getByText(
      "mini: 87,000 to send, 4,000 awaiting confirmation · received through change #613,000",
    ),
  ).toBeTruthy();
  expect(screen.getByText("~/Projects/ws/api")).toBeTruthy();
  expect(screen.getByText("Move lock to Openbase trash")).toBeTruthy();
  expect(screen.getByText(/1 branch conflict: neither/)).toBeTruthy();
});

it("resolves one conflict and opens its versions", async () => {
  route({
    conflicts: [fileConflict(11, "ws/cli/pkg/_version.py", "ws/cli")],
    detail: {
      11: {
        conflict: fileConflict(11, "ws/cli/pkg/_version.py", "ws/cli"),
        detail: {
          kind: "content",
          versions: {
            a: { hash: "a".repeat(64), available: true, size: 6, binary: false, truncated: false, text: "mine\n" },
            b: { hash: "b".repeat(64), available: true, size: 7, binary: false, truncated: false, text: "theirs\n" },
            ancestor: { hash: "", available: false, size: null, binary: false, truncated: false, text: null },
          },
          diff: "--- mini\n+++ laptop\n@@ -1 +1 @@\n-theirs\n+mine\n",
          diff_truncated: false,
          current: { exists: true, size: 6, modified: null, is_dir: false },
        },
      },
    },
    post: () => jsonResponse({ resolved: true, id: 11, choice: "a" }),
  });

  render(<SyncDaemonCard />);

  // one group: it opens by itself
  fireEvent.click(await screen.findByText("pkg/_version.py"));
  expect(await screen.findByText("+mine")).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "This computer" }));
  expect(screen.getByText("mine")).toBeTruthy();

  fireEvent.click(screen.getByText("Keep this computer's"));
  await waitFor(() => expect(mutations()).toHaveLength(1));
  const [url, init] = mutations()[0];
  expect(url).toBe("/api/sync/daemon/conflicts/resolve/");
  expect(JSON.parse(String(init?.body))).toEqual({
    id: 11,
    action: "keep_local",
  });
});

it("labels the local side correctly when it is side B", async () => {
  const conflict = {
    ...fileConflict(12, "ws/cli/pkg/config.py", "ws/cli"),
    a_device: "gabes-mac-mini",
    b_device: "laptop",
    a_is_local: false,
  };
  route({
    conflicts: [conflict],
    detail: {
      12: {
        conflict,
        detail: {
          kind: "content",
          versions: {
            a: {
              hash: "a".repeat(64),
              available: true,
              size: 7,
              binary: false,
              truncated: false,
              text: "mini\n",
            },
            b: {
              hash: "b".repeat(64),
              available: true,
              size: 6,
              binary: false,
              truncated: false,
              text: "mine\n",
            },
            ancestor: {
              hash: "",
              available: false,
              size: null,
              binary: false,
              truncated: false,
              text: null,
            },
          },
          diff: "--- laptop\n+++ mini\n@@ -1 +1 @@\n-mine\n+mini\n",
          diff_truncated: false,
          current: { exists: true, size: 6, modified: null, is_dir: false },
        },
      },
    },
  });

  render(<SyncDaemonCard />);

  fireEvent.click(await screen.findByText("pkg/config.py"));
  expect(await screen.findByText("+mini")).toBeTruthy();
  expect(screen.getByText("Take mini's")).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "This computer" }));
  expect(screen.getByText("mine")).toBeTruthy();
});

it("bulk-resolves a selected group after a confirmation stating the count", async () => {
  const conflicts = [
    fileConflict(1, "ws/cli/a.txt", "ws/cli"),
    fileConflict(2, "ws/cli/b.txt", "ws/cli"),
    branchConflict,
    fileConflict(4, "notes/c.md", "notes"),
  ];
  route({
    conflicts,
    post: (_path, body) => {
      const ids = (body as { ids: number[] }).ids;
      return jsonResponse({
        resolved: ids.length,
        failed: 0,
        choice: "b",
        results: ids.map((id) => ({ id, ok: true, error: null })),
      });
    },
  });

  render(<SyncDaemonCard />);

  fireEvent.click(await screen.findByLabelText("Select all in ws/cli"));
  expect(screen.getByText("2 conflicts selected")).toBeTruthy();
  fireEvent.click(screen.getByText("Take the other computer's versions"));
  expect(mutations()).toHaveLength(0);
  expect(
    screen.getByText("Take the other computer's version of 2 conflicts?"),
  ).toBeTruthy();
  fireEvent.click(screen.getByText("Resolve 2 conflicts"));

  await waitFor(() => expect(mutations()).toHaveLength(1));
  expect(JSON.parse(String(mutations()[0][1]?.body))).toEqual({
    ids: [1, 2],
    action: "use_remote",
  });
});

it("explains branch conflicts instead of offering a file choice", async () => {
  route({
    conflicts: [branchConflict],
    detail: {
      3: {
        conflict: branchConflict,
        detail: {
          kind: "git-branch",
          repo: "ws/cli",
          repo_path: "/Users/x/Projects/ws/cli",
          ref: "refs/heads/staging",
          branch: "staging",
          this_sha: "1".repeat(40),
          other_sha: "2".repeat(40),
          current_sha: "1".repeat(40),
          moved_since: false,
          other_available: true,
          merge_base: "3".repeat(40),
          this_only: [{ sha: "1".repeat(40), subject: "mine" }],
          other_only: [{ sha: "2".repeat(40), subject: "theirs" }],
          this_ahead: 1,
          other_ahead: 1,
          checked_out: false,
        },
      },
    },
  });

  render(<SyncDaemonCard />);

  fireEvent.click(await screen.findByText("branch staging"));
  expect(await screen.findByText("Only on mini")).toBeTruthy();
  expect(screen.queryByText("Keep this computer's")).toBeNull();
  expect(screen.getByText("resolve in git")).toBeTruthy();
  expect(screen.getByLabelText("Select branch staging")).toHaveProperty(
    "disabled",
    true,
  );
  expect(screen.getByText(/git merge 2222222222/)).toBeTruthy();
});

it("pages through many groups and filters them", async () => {
  const conflicts = Array.from({ length: 1000 }, (_, index) =>
    fileConflict(index + 1, `repo${index % 50}/f${index}.txt`, `repo${index % 50}`),
  );
  route({ conflicts });

  render(<SyncDaemonCard />);

  expect(await screen.findByText("1,000 conflicts")).toBeTruthy();
  expect(
    screen.getByText(`Groups 1–${GROUPS_PER_PAGE} of 50 (1,000 conflicts)`),
  ).toBeTruthy();
  fireEvent.click(screen.getByText("Next"));
  expect(screen.getByText(`Groups 21–40 of 50 (1,000 conflicts)`)).toBeTruthy();

  fireEvent.change(screen.getByLabelText("Search conflicts"), {
    target: { value: "repo7/" },
  });
  // a single matching group opens by itself
  expect(await screen.findByText("f7.txt")).toBeTruthy();
});

it("adds and removes folders", async () => {
  route({});
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

  // an edge asks where to stop syncing; a full copy suggests everywhere
  fireEvent.click(screen.getByLabelText("Stop syncing ~/.openbase/thread-sync"));
  fireEvent.click(await screen.findByText("everywhere"));
  await waitFor(() => expect(mutations()).toHaveLength(2));
  const [, removeInit] = mutations()[1];
  expect(removeInit?.method).toBe("DELETE");
  expect(JSON.parse(String(removeInit?.body))).toEqual({
    path: "~/.openbase/thread-sync",
    scope: "everywhere",
  });
});

it("a project-only computer adds the hub's other folders and removes here only", async () => {
  route({
    settings: { ...edgeSettings, project_only: true },
    available: {
      role: "edge",
      hub_name: "mini",
      project_only: true,
      folders: [
        { id: "projects", path: "~/Projects", files: 1200, bytes: 2048, synced_here: true },
        { id: "projects-gamma", path: "~/Projects/gamma", files: 7, bytes: 1024 * 1024, synced_here: false },
      ],
      disk: { free_bytes: 1, total_bytes: 2 },
    },
  });
  render(<SyncDaemonCard />);

  expect(await screen.findByText("Also on mini, not synced here:")).toBeTruthy();
  expect(screen.getByText(/~\/Projects\/gamma · 7 files · 1.0 MB/)).toBeTruthy();
  fireEvent.click(screen.getByText("Sync here"));
  await waitFor(() => expect(mutations()).toHaveLength(1));
  expect(JSON.parse(String(mutations()[0][1]?.body))).toEqual({ path: "~/Projects/gamma" });

  fireEvent.click(screen.getByLabelText("Stop syncing ~/.openbase/thread-sync"));
  fireEvent.click(await screen.findByText("on this computer"));
  await waitFor(() => expect(mutations()).toHaveLength(2));
  expect(JSON.parse(String(mutations()[1][1]?.body))).toEqual({
    path: "~/.openbase/thread-sync",
    scope: "this_computer",
  });
});

it("shows each folder's disk and warns when it is low", async () => {
  const MB = 1024 * 1024;
  route({
    status: {
      ...edgeStatus,
      overview: {
        state: "in_sync",
        role: "edge",
        device: "laptop",
        peers_connected: 1,
        offline_peers: [],
        totals: { unsent: 0, unacked: 0, pending_fetches: 0, entries: 1200 },
        roots: [
          {
            ...edgeStatus.roots[0],
            pins: [],
            ignore: [],
            unsent: 0,
            unacked: 0,
            peers: [],
            bytes: 40 * MB,
            disk: {
              free_bytes: 300 * MB,
              total_bytes: 5 * 1024 * MB,
              low_water_bytes: 512 * MB,
              low_water_auto: true,
              below_low_water: true,
              held_files: 3,
              held_bytes: 2 * MB,
              refused_writes: 3,
              lazy_threshold_bytes: 51 * MB,
              pinned_threshold_bytes: 256 * MB,
            },
          },
        ],
        attention: { conflicts: 0, stale_locks: 0, low_disk: ["/Users/x/Projects"], needed: true },
      },
    },
  });
  render(<SyncDaemonCard />);

  expect(await screen.findByText(/· 40.0 MB/)).toBeTruthy();
  expect(
    screen.getByText(
      "Disk: 300.0 MB free of 5.0 GB · sync keeps 512.0 MB free · Low disk: sync writes here are paused until space returns (3 files, 2.0 MB waiting)",
    ),
  ).toBeTruthy();
  expect(screen.getByText(/Low disk on \/Users\/x\/Projects/)).toBeTruthy();
});

it("stops syncing only after confirmation", async () => {
  route({});
  render(<SyncDaemonCard />);

  fireEvent.click(await screen.findByText("Stop syncing on this computer"));
  expect(mutations()).toHaveLength(0);
  expect(screen.getByText("Stop syncing on this computer?")).toBeTruthy();

  fireEvent.click(screen.getByText("Stop syncing"));

  await waitFor(() => expect(mutations()).toHaveLength(1));
  expect(mutations()[0][0]).toBe("/api/sync/daemon/pairing/leave/");
});

it("on the hub, says so and waits for its computers", async () => {
  route({
    settings: { ...edgeSettings, role: "hub", hub_is_self: true },
    status: {
      ...edgeStatus,
      role: "hub",
      peers: null,
      overview: {
        state: "waiting",
        role: "hub",
        device: "mini",
        peers_connected: 0,
        offline_peers: [{ device: "laptop", role: "edge", last_seen: null }],
        totals: { unsent: 0, unacked: 0, pending_fetches: 0, entries: 1200 },
        roots: [],
        attention: { conflicts: 0, stale_locks: 0, needed: false },
      },
    },
    conflicts: null,
  });

  render(<SyncDaemonCard />);

  expect(
    await screen.findByText(
      "This is your always-on computer. Your other computers sync with it.",
    ),
  ).toBeTruthy();
  expect(await screen.findByText("waiting for peer")).toBeTruthy();
  expect(await screen.findByText("No other computer connected")).toBeTruthy();
  expect(screen.getByText("Computers syncing with this one")).toBeTruthy();
  expect(screen.getByText(/not connected/)).toBeTruthy();
});
