import type {
  SyncDaemonStatus,
  SyncOverview,
  SyncOverviewRoot,
} from "./syncTypes";

export const formatCount = (value: number) => value.toLocaleString("en-US");

export const plural = (count: number, one: string, many = `${one}s`) =>
  `${formatCount(count)} ${count === 1 ? one : many}`;

/** "3 minutes ago" for an ISO timestamp; `null` when it cannot be parsed. */
export const formatAgo = (iso: string | null | undefined, now = Date.now()) => {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return null;
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${plural(minutes, "minute")} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${plural(hours, "hour")} ago`;
  return `${plural(Math.round(hours / 24), "day")} ago`;
};

export const formatDuration = (seconds: number) => {
  if (seconds < 90) return `${Math.max(1, Math.round(seconds))} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${minutes} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return plural(Math.round(hours / 24), "day");
};

export const formatBytes = (bytes: number | null | undefined) => {
  if (bytes == null) return "unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

/**
 * The overview for a status payload from an Openbase version whose local API
 * does not add one yet: same rules as the API's, without stale locks or
 * last-seen times.
 */
export const fallbackOverview = (status: SyncDaemonStatus): SyncOverview => {
  const peers = status.peers ?? [];
  const roots: SyncOverviewRoot[] = (status.roots ?? []).map((root) => {
    const peerRows = peers.map((peer) => {
      const progress = peer.roots?.[root.id];
      const sent = progress?.sent_seq ?? 0;
      const acked = progress?.acked_seq ?? 0;
      return {
        device: peer.device,
        sent_seq: sent,
        acked_seq: acked,
        received_seq: progress?.applied_peer_seq ?? 0,
        unsent: Math.max(0, root.seq - sent),
        unacked: Math.max(0, sent - acked),
      };
    });
    return {
      ...root,
      pins: [],
      ignore: [],
      unsent: Math.max(0, ...peerRows.map((row) => row.unsent)),
      unacked: Math.max(0, ...peerRows.map((row) => row.unacked)),
      peers: peerRows,
    };
  });
  const totals = {
    unsent: roots.reduce((sum, root) => sum + root.unsent, 0),
    unacked: roots.reduce((sum, root) => sum + root.unacked, 0),
    pending_fetches: roots.reduce((sum, root) => sum + root.pending_fetches, 0),
    entries: roots.reduce((sum, root) => sum + root.entries, 0),
  };
  const state = !peers.length
    ? status.role === "hub"
      ? "waiting"
      : "offline"
    : roots.some((root) => root.scanning)
      ? "scanning"
      : totals.unsent || totals.unacked || totals.pending_fetches
        ? "syncing"
        : "in_sync";
  return {
    state,
    role: status.role,
    device: status.device,
    peers_connected: peers.length,
    offline_peers: [],
    totals,
    roots,
    attention: {
      conflicts: status.open_conflicts ?? 0,
      stale_locks: null,
      needed: Boolean(status.open_conflicts),
    },
  };
};

export const overviewOf = (status: SyncDaemonStatus): SyncOverview =>
  status.overview ?? fallbackOverview(status);

/** Changes still in flight in either direction. */
export const backlogOf = (overview: SyncOverview) =>
  overview.totals.unsent +
  overview.totals.unacked +
  overview.totals.pending_fetches;

export type BacklogSample = { at: number; backlog: number };

export type BacklogTrack = { samples: BacklogSample[]; peak: number };

const RATE_WINDOW_MS = 120_000;
const STALL_AFTER_MS = 60_000;

/** Adds a poll's backlog; the peak resets once the backlog drains. */
export const trackBacklog = (
  track: BacklogTrack,
  sample: BacklogSample,
): BacklogTrack => {
  if (sample.backlog === 0) return { samples: [sample], peak: 0 };
  const samples = [...track.samples, sample].filter(
    (entry) => sample.at - entry.at <= RATE_WINDOW_MS,
  );
  return { samples, peak: Math.max(track.peak, sample.backlog) };
};

export type BacklogProgress = {
  backlog: number;
  peak: number;
  /** Share of the peak backlog already done, 0..1. */
  fraction: number;
  /** Changes cleared per second over the last two minutes (null: too soon). */
  perSecond: number | null;
  etaSeconds: number | null;
  /** No progress for over a minute while changes are waiting. */
  stalled: boolean;
};

export const backlogProgress = (track: BacklogTrack): BacklogProgress => {
  const latest = track.samples[track.samples.length - 1];
  const backlog = latest?.backlog ?? 0;
  const peak = Math.max(track.peak, backlog);
  const fraction = peak > 0 ? Math.min(1, Math.max(0, 1 - backlog / peak)) : 1;
  const oldest = track.samples[0];
  const span = latest && oldest ? latest.at - oldest.at : 0;
  let perSecond: number | null = null;
  let etaSeconds: number | null = null;
  if (latest && oldest && span >= 10_000) {
    const cleared = oldest.backlog - latest.backlog;
    perSecond = Math.max(0, cleared / (span / 1000));
    etaSeconds = perSecond > 0 ? backlog / perSecond : null;
  }
  const stalled =
    backlog > 0 &&
    span >= STALL_AFTER_MS &&
    oldest !== undefined &&
    latest !== undefined &&
    latest.backlog >= oldest.backlog &&
    track.samples
      .filter((entry) => latest.at - entry.at <= STALL_AFTER_MS)
      .every((entry) => entry.backlog <= latest.backlog);
  return { backlog, peak, fraction, perSecond, etaSeconds, stalled };
};

export type HealthTone = "ok" | "busy" | "warn" | "error" | "neutral";

export type SyncHealth = {
  tone: HealthTone;
  title: string;
  lines: string[];
  /** 0..1 while syncing a backlog. */
  progress: number | null;
};

const attentionTitle = (conflicts: number, staleLocks: number | null) => {
  const parts: string[] = [];
  if (conflicts) parts.push(plural(conflicts, "conflict"));
  if (staleLocks) parts.push(plural(staleLocks, "stale git lock"));
  return parts.join(" and ");
};

/** The banner: is sync healthy, and what needs the user. */
export const describeHealth = ({
  overview,
  unreachable,
  hubLabel,
  progress,
  now = Date.now(),
}: {
  overview: SyncOverview | null;
  unreachable: boolean;
  hubLabel: string | null;
  progress: BacklogProgress | null;
  now?: number;
}): SyncHealth => {
  if (unreachable || !overview) {
    return {
      tone: "error",
      title: "Openbase Sync is not running",
      lines: [
        "The sync service on this computer is not answering, so nothing syncs until it is back. Changes made meanwhile are picked up when it restarts.",
      ],
      progress: null,
    };
  }
  const { totals, attention } = overview;
  const needs = attentionTitle(attention.conflicts, attention.stale_locks);
  const lines: string[] = [];
  const lastSeen = (role: string) => {
    const peer = overview.offline_peers.find((entry) => entry.role === role);
    return peer ? formatAgo(peer.last_seen, now) : null;
  };

  if (overview.state === "offline") {
    const seen = lastSeen("hub");
    const hub = hubLabel ?? "your always-on computer";
    lines.push(
      seen
        ? `Last connected ${seen}.`
        : "Not connected since Openbase started on this computer.",
    );
    lines.push(
      "Changes made here are kept and sent once the connection is back.",
    );
    if (needs) lines.push(`Also needs you: ${needs}.`);
    return { tone: "warn", title: `Can't reach ${hub}`, lines, progress: null };
  }
  if (overview.state === "waiting") {
    const seen = overview.offline_peers.length
      ? overview.offline_peers
          .map((peer) => {
            const ago = formatAgo(peer.last_seen, now);
            return ago ? `${peer.device} (last connected ${ago})` : peer.device;
          })
          .join(", ")
      : null;
    lines.push(
      seen
        ? `Not connected now: ${seen}. Your other computers sync when they are awake.`
        : "Your other computers sync with this one when they are awake.",
    );
    if (needs) lines.push(`Needs you: ${needs}.`);
    return {
      tone: needs ? "warn" : "neutral",
      title: "No other computer connected",
      lines,
      progress: null,
    };
  }

  const backlogParts: string[] = [];
  if (totals.unsent) {
    backlogParts.push(`${plural(totals.unsent, "change")} waiting to send`);
  }
  if (totals.unacked) {
    backlogParts.push(`${formatCount(totals.unacked)} awaiting confirmation`);
  }
  if (totals.pending_fetches) {
    backlogParts.push(`${plural(totals.pending_fetches, "file")} downloading`);
  }

  if (overview.state === "scanning") {
    const scanning = overview.roots
      .filter((root) => root.scanning)
      .map((root) => root.path);
    lines.push(`Looking for changes in ${scanning.join(", ")}.`);
    if (backlogParts.length) lines.push(`${backlogParts.join(" · ")}.`);
    if (needs) lines.push(`Needs you: ${needs}.`);
    return { tone: "busy", title: "Checking files", lines, progress: null };
  }

  if (overview.state === "syncing") {
    lines.push(`${backlogParts.join(" · ")}.`);
    let tone: HealthTone = "busy";
    let title = "Syncing";
    if (progress?.stalled) {
      tone = "warn";
      title = "Syncing is not making progress";
      lines.push(
        "The backlog has not shrunk in the last minute. Openbase Sync keeps trying; if it stays stuck, check that both computers are awake and online, then the sync-daemon service logs.",
      );
    } else if (progress?.perSecond) {
      const eta =
        progress.etaSeconds != null
          ? `, about ${formatDuration(progress.etaSeconds)} left`
          : "";
      lines.push(
        `About ${formatCount(Math.round(progress.perSecond))} changes per second${eta}.`,
      );
    }
    if (needs) lines.push(`Needs you: ${needs}.`);
    return {
      tone,
      title,
      lines,
      progress: progress && progress.peak > 0 ? progress.fraction : null,
    };
  }

  if (needs) {
    lines.push("Everything else is up to date.");
    return {
      tone: "warn",
      title: `Needs attention: ${needs}`,
      lines,
      progress: null,
    };
  }
  return {
    tone: "ok",
    title: "Up to date",
    lines: [`${plural(totals.entries, "entry", "entries")} in sync.`],
    progress: null,
  };
};
