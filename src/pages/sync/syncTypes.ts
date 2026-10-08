/** Shapes served by the local API's `/api/sync/daemon/*` routes. */

export type SyncDaemonSettings = {
  configured: boolean;
  reachable?: boolean;
  role?: string;
  device_id?: string;
  sync_group?: string;
  peer_hot?: string;
  listen_hot?: string;
  hub_is_self?: boolean;
  hub_name?: string | null;
  hub_host?: string | null;
  roots: { id?: string; path?: string; pins?: string[]; ignore?: string[] }[];
};

export type SyncPeerRootProgress = {
  sent_seq: number;
  acked_seq: number;
  applied_peer_seq: number;
};

export type SyncDaemonPeer = {
  device: string;
  role: string;
  rtt_ms: number;
  connected_at?: string;
  roots: Record<string, SyncPeerRootProgress>;
};

export type SyncDaemonRoot = {
  id: string;
  path: string;
  entries: number;
  seq: number;
  pending_fetches: number;
  scanning: boolean;
};

export type SyncHeadline = "in_sync" | "syncing" | "scanning" | "offline" | "waiting";

export type SyncOverviewPeerBacklog = {
  device: string;
  sent_seq: number;
  acked_seq: number;
  received_seq: number;
  unsent: number;
  unacked: number;
};

export type SyncOverviewRoot = SyncDaemonRoot & {
  pins: string[];
  ignore: string[];
  unsent: number;
  unacked: number;
  peers: SyncOverviewPeerBacklog[];
};

export type SyncOverview = {
  state: SyncHeadline;
  role: string;
  device: string;
  peers_connected: number;
  offline_peers: { device: string; role: string; last_seen: string | null }[];
  totals: {
    unsent: number;
    unacked: number;
    pending_fetches: number;
    entries: number;
  };
  roots: SyncOverviewRoot[];
  attention: {
    conflicts: number;
    stale_locks: number | null;
    needed: boolean;
  };
};

export type SyncDaemonStatus = {
  device: string;
  role: string;
  uptime_s: number;
  roots: SyncDaemonRoot[];
  peers: SyncDaemonPeer[];
  open_conflicts: number;
  metrics?: {
    local_changes: number;
    remote_applied: number;
    conflicts: number;
    merges: number;
    bytes_sent: number;
    bytes_received: number;
  };
  /** Added by the local API; absent from older Openbase versions. */
  overview?: SyncOverview;
};

export type SyncConflictKind =
  | "content"
  | "delete-edit"
  | "type"
  | "collision"
  | "sqlite-writer"
  | "git-branch";

export type SyncDaemonConflict = {
  id: number;
  root: string;
  path: string;
  kind: SyncConflictKind | string;
  a_hash?: string;
  b_hash?: string;
  ancestor?: string;
  a_device: string;
  b_device: string;
  created_ns: number;
  label?: string;
  /** Added by the local API (absent from older Openbase versions). */
  root_path?: string;
  repo?: string;
  ref?: string;
  group?: string;
  a_is_local?: boolean;
};

export type SyncVersion = {
  hash: string;
  available: boolean;
  size: number | null;
  binary: boolean;
  truncated: boolean;
  text: string | null;
};

export type SyncFileConflictDetail = {
  kind: string;
  versions: { a: SyncVersion; b: SyncVersion; ancestor: SyncVersion };
  diff: string | null;
  diff_truncated: boolean;
  current: {
    exists: boolean;
    size?: number;
    modified?: string | null;
    is_dir?: boolean;
  } | null;
};

export type SyncCommit = { sha: string; subject: string };

export type SyncBranchConflictDetail = {
  kind: "git-branch";
  repo: string;
  repo_path: string;
  ref: string;
  branch: string;
  this_sha: string;
  other_sha: string;
  current_sha: string | null;
  moved_since: boolean;
  other_available: boolean;
  merge_base: string | null;
  this_only: SyncCommit[];
  other_only: SyncCommit[];
  this_ahead: number | null;
  other_ahead: number | null;
  checked_out: boolean;
};

export type SyncConflictDetailResponse = {
  conflict: SyncDaemonConflict;
  detail: SyncFileConflictDetail | SyncBranchConflictDetail;
};

export type SyncStaleLock = {
  repo: string;
  path: string;
  name: string;
  exists: boolean;
  age_s: number | null;
  modified: string | null;
};

export type SyncStaleLocksResponse = {
  /** null until the first scan finishes. */
  locks: SyncStaleLock[] | null;
  checked_at: string | null;
  refreshing: boolean;
  error: string | null;
  stale_after_s: number;
};
