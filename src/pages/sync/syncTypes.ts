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
  /** Syncs only chosen folders and keeps large files on the hub (a cloud workspace). */
  project_only?: boolean;
  roots: {
    id?: string;
    path?: string;
    pins?: string[];
    ignore?: string[];
    /** Root-relative paths this computer syncs in the folder (absent: all). */
    only?: string[];
  }[];
};

export type SyncDiskUsage = { free_bytes: number | null; total_bytes: number | null };

/** A folder inside one of the hub's folders (a project of ~/Projects). */
export type SyncHubSubfolder = {
  name: string;
  path: string;
  files: number | null;
  bytes: number | null;
  selected?: boolean;
  synced_here?: boolean;
};

/** One of the hub's folders, with its size from the hub (null: unknown). */
export type SyncHubFolder = {
  id: string;
  path: string;
  files: number | null;
  bytes: number | null;
  /** Projects inside (null: the hub could not say). */
  subfolders?: SyncHubSubfolder[] | null;
  /** An edge syncing only some projects of this folder, and which. */
  partly_synced_here?: boolean;
  only?: string[];
  /** Join preview: preselected (every folder on a laptop, none on a cloud workspace). */
  selected?: boolean;
  synced_here?: boolean;
  exists_here?: boolean;
};

/** `GET /api/sync/daemon/pairing/hub-folders/?hub=` */
export type SyncHubFoldersPreview = {
  hub_name: string;
  hub_host: string;
  folders: SyncHubFolder[];
  this_computer: {
    cloud_workspace: boolean;
    project_only_default: boolean;
    disk: SyncDiskUsage;
  };
  project_only: boolean;
};

/** `GET /api/sync/daemon/roots/available/` (an edge: the hub's folders). */
export type SyncAvailableRoots = {
  role: string;
  hub_name: string | null;
  project_only?: boolean;
  folders: SyncHubFolder[];
  disk: SyncDiskUsage;
};

/** A root's volume and the limits the daemon enforces on it. */
export type SyncRootDisk = {
  free_bytes: number | null;
  total_bytes: number | null;
  low_water_bytes: number;
  low_water_auto: boolean;
  below_low_water: boolean;
  held_files: number;
  held_bytes: number;
  refused_writes: number;
  lazy_threshold_bytes: number;
  pinned_threshold_bytes: number;
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
  /** Absent from older Openbase versions. */
  bytes?: number;
  disk?: SyncRootDisk | null;
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
    /** Folders whose disk is below the free-space floor (absent: older Openbase). */
    low_disk?: string[];
    needed: boolean;
  };
  versions?: {
    usage_bytes: number;
    quota_bytes: number;
    quota_auto: boolean;
    retention_days: number;
    over_quota: boolean;
  } | null;
  thin?: boolean;
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
