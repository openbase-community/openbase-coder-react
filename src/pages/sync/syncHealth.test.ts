import { describe, expect, it } from "vitest";
import {
  backlogProgress,
  describeHealth,
  fallbackOverview,
  formatAgo,
  trackBacklog,
  type BacklogTrack,
} from "./syncHealth";
import type { SyncDaemonStatus, SyncOverview } from "./syncTypes";

const status: SyncDaemonStatus = {
  device: "laptop",
  role: "edge",
  uptime_s: 1,
  roots: [
    {
      id: "projects",
      path: "/Users/x/Projects",
      entries: 834_000,
      seq: 950_000,
      pending_fetches: 0,
      scanning: false,
    },
  ],
  peers: [
    {
      device: "mini",
      role: "hub",
      rtt_ms: 50,
      roots: {
        projects: { sent_seq: 863_000, acked_seq: 859_000, applied_peer_seq: 613_000 },
      },
    },
  ],
  open_conflicts: 194,
};

const NOW = Date.parse("2026-10-07T20:00:00Z");

describe("fallbackOverview", () => {
  it("computes the backlog the API would", () => {
    const overview = fallbackOverview(status);
    expect(overview.state).toBe("syncing");
    expect(overview.totals.unsent).toBe(87_000);
    expect(overview.totals.unacked).toBe(4_000);
    expect(overview.roots[0].peers[0].received_seq).toBe(613_000);
    expect(overview.attention).toEqual({
      conflicts: 194,
      stale_locks: null,
      needed: true,
    });
  });

  it("knows an edge without its hub is offline and a lonely hub waits", () => {
    expect(fallbackOverview({ ...status, peers: [] }).state).toBe("offline");
    expect(fallbackOverview({ ...status, role: "hub", peers: [] }).state).toBe(
      "waiting",
    );
  });
});

describe("backlog progress", () => {
  const feed = (values: [number, number][]) =>
    values.reduce<BacklogTrack>(
      (track, [at, backlog]) => trackBacklog(track, { at, backlog }),
      { samples: [], peak: 0 },
    );

  it("measures progress, rate and time left", () => {
    const progress = backlogProgress(
      feed([
        [0, 10_000],
        [10_000, 8_000],
        [20_000, 6_000],
      ]),
    );
    expect(progress.fraction).toBeCloseTo(0.4);
    expect(progress.perSecond).toBeCloseTo(200);
    expect(progress.etaSeconds).toBeCloseTo(30);
    expect(progress.stalled).toBe(false);
  });

  it("flags a backlog that has not moved for a minute", () => {
    const progress = backlogProgress(
      feed([
        [0, 87_000],
        [30_000, 87_000],
        [65_000, 87_000],
      ]),
    );
    expect(progress.stalled).toBe(true);
    expect(progress.perSecond).toBe(0);
  });

  it("resets the peak once drained", () => {
    const track = feed([
      [0, 50],
      [5_000, 0],
      [10_000, 10],
    ]);
    expect(track.peak).toBe(10);
  });
});

const overview = (patch: Partial<SyncOverview>): SyncOverview => ({
  ...fallbackOverview(status),
  ...patch,
});

describe("describeHealth", () => {
  it("says when the daemon is not running", () => {
    const health = describeHealth({
      overview: null,
      unreachable: true,
      hubLabel: null,
      progress: null,
    });
    expect(health.tone).toBe("error");
    expect(health.title).toBe("Openbase Sync is not running");
  });

  it("names the unreachable hub and when it was last seen", () => {
    const health = describeHealth({
      overview: overview({
        state: "offline",
        offline_peers: [
          { device: "mini", role: "hub", last_seen: "2026-10-07T19:50:00Z" },
        ],
      }),
      unreachable: false,
      hubLabel: "Mac mini",
      progress: null,
      now: NOW,
    });
    expect(health.title).toBe("Can't reach Mac mini");
    expect(health.lines[0]).toBe("Last connected 10 minutes ago.");
    expect(health.lines.at(-1)).toBe("Also needs you: 194 conflicts.");
  });

  it("shows the backlog, rate and what needs the user while syncing", () => {
    const health = describeHealth({
      overview: overview({
        attention: { conflicts: 194, stale_locks: 52, needed: true },
      }),
      unreachable: false,
      hubLabel: null,
      progress: {
        backlog: 91_000,
        peak: 100_000,
        fraction: 0.09,
        perSecond: 1200,
        etaSeconds: 76,
        stalled: false,
      },
    });
    expect(health.tone).toBe("busy");
    expect(health.lines[0]).toBe(
      "87,000 changes waiting to send · 4,000 awaiting confirmation.",
    );
    expect(health.lines[1]).toBe(
      "About 1,200 changes per second, about 76 s left.",
    );
    expect(health.lines[2]).toBe(
      "Needs you: 194 conflicts and 52 stale git locks.",
    );
    expect(health.progress).toBeCloseTo(0.09);
  });

  it("warns when the backlog is stuck", () => {
    const health = describeHealth({
      overview: overview({}),
      unreachable: false,
      hubLabel: null,
      progress: {
        backlog: 91_000,
        peak: 91_000,
        fraction: 0,
        perSecond: 0,
        etaSeconds: null,
        stalled: true,
      },
    });
    expect(health.tone).toBe("warn");
    expect(health.title).toBe("Syncing is not making progress");
  });

  it("is up to date, or needs attention when only conflicts remain", () => {
    const caughtUp = overview({
      state: "in_sync",
      totals: { unsent: 0, unacked: 0, pending_fetches: 0, entries: 12 },
      attention: { conflicts: 0, stale_locks: 0, needed: false },
    });
    expect(
      describeHealth({
        overview: caughtUp,
        unreachable: false,
        hubLabel: null,
        progress: null,
      }),
    ).toMatchObject({ tone: "ok", title: "Up to date" });
    expect(
      describeHealth({
        overview: {
          ...caughtUp,
          attention: { conflicts: 1, stale_locks: 0, needed: true },
        },
        unreachable: false,
        hubLabel: null,
        progress: null,
      }),
    ).toMatchObject({ tone: "warn", title: "Needs attention: 1 conflict" });
  });

  it("on a hub, lists the computers that are away", () => {
    const health = describeHealth({
      overview: overview({
        state: "waiting",
        role: "hub",
        offline_peers: [
          { device: "laptop", role: "edge", last_seen: "2026-10-07T18:00:00Z" },
        ],
        attention: { conflicts: 0, stale_locks: null, needed: false },
      }),
      unreachable: false,
      hubLabel: null,
      progress: null,
      now: NOW,
    });
    expect(health.tone).toBe("neutral");
    expect(health.lines[0]).toContain("laptop (last connected 2 hours ago)");
  });
});

describe("formatAgo", () => {
  it("handles missing and recent times", () => {
    expect(formatAgo(null, NOW)).toBeNull();
    expect(formatAgo("2026-10-07T19:59:50Z", NOW)).toBe("just now");
    expect(formatAgo("2026-10-05T20:00:00Z", NOW)).toBe("2 days ago");
  });
});
