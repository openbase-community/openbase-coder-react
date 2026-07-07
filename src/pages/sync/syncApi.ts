export type SyncPeer = {
  name: string;
  kind: string;
  tailscale_magic_dns: string;
  syncthing_device_id: string;
};

export type SyncFolderSettings = {
  id: string;
  relpath: string;
  extra_ignores: string[];
};

export type SyncSettingsResponse = {
  schema_version: number;
  enabled: boolean;
  eligible: boolean;
  eligible_reason: string;
  self_device_id: string | null;
  peers: SyncPeer[];
  folders: SyncFolderSettings[];
  versions_usage_bytes: number;
};

export type SyncFolderUpdate = {
  relpath: string;
  extra_ignores?: string[];
};

export type SyncSettingsUpdate = {
  enabled?: boolean;
  folders?: SyncFolderUpdate[];
};

export type SyncFolderStatus = {
  id: string;
  relpath: string;
  state: string;
  completion: number;
  receive_only: boolean;
  peer_completion: Record<string, number>;
};

export type SyncStatusResponse = {
  enabled: boolean;
  folders: SyncFolderStatus[];
  last_reconcile_at: string | null;
  conflicts_count: number;
};

export type SyncConflictType = "repo-divergence" | "file-conflict";

export type SyncConflict = {
  id: string;
  folder_id: string;
  repo_relpath: string;
  branch: string;
  type: SyncConflictType;
  local_sha?: string;
  remote_sha?: string;
  files?: string[];
  detected_at: string;
};

export type SyncConflictsResponse = {
  conflicts: SyncConflict[];
};

export type SyncPurgeResponse = {
  freed_bytes: number;
};

/** Kinds of devices that only view synced code and never participate in sync. */
const PHONE_KINDS = new Set(["phone", "iphone", "ipad", "ios", "android"]);

export const isPhonePeer = (peer: SyncPeer) =>
  PHONE_KINDS.has(peer.kind.toLowerCase());

export const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const shortSha = (value?: string) =>
  value ? value.slice(0, 7) : "unknown";

export const displayRelpath = (relpath: string) => `~/${relpath}`;

/**
 * Validates a user-entered folder path and normalizes it to a home-relative
 * path (no leading `~/`). Accepts `~/Projects/foo` or `Projects/foo`.
 */
export const parseHomeRelativePath = (
  raw: string,
): { relpath: string; error?: undefined } | { relpath?: undefined; error: string } => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { error: "Enter a folder path under your home directory." };
  }
  if (trimmed === "~" || trimmed === "~/") {
    return { error: "Pick a folder inside your home directory, not all of it." };
  }
  let rest = trimmed;
  if (rest.startsWith("~/")) {
    rest = rest.slice(2);
  } else if (rest.startsWith("~")) {
    return { error: "Paths for other users' homes are not supported." };
  }
  if (rest.startsWith("/")) {
    return {
      error: "Use a path under your home directory, like ~/Projects/my-app.",
    };
  }
  const segments = rest.split("/").filter((segment) => segment.length > 0);
  if (segments.some((segment) => segment === "..")) {
    return { error: "The path must stay under your home directory." };
  }
  const relpath = segments.filter((segment) => segment !== ".").join("/");
  if (!relpath) {
    return { error: "Pick a folder inside your home directory, not all of it." };
  }
  return { relpath };
};
