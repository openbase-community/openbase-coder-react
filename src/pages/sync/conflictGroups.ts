import type { SyncDaemonConflict } from "./syncTypes";

export type ConflictKindInfo = {
  /** Plain words for the list. */
  label: string;
  /** "3 diverged branches": a count in plain words. */
  count?: (n: number) => string;
  /** What happened and what the choices do. */
  explain: string;
};

export const KIND_INFO: Record<string, ConflictKindInfo> = {
  content: {
    count: (n) => `${n.toLocaleString("en-US")} edited on both computers`,
    label: "Edited on both computers",
    explain:
      "Both computers changed this file since they last agreed, and the changes could not be merged. Choose the version to keep everywhere; Openbase Sync keeps a copy of both.",
  },
  "delete-edit": {
    count: (n) => `${n.toLocaleString("en-US")} deleted on one computer, edited on the other`,
    label: "Deleted on one computer, edited on the other",
    explain:
      "One computer deleted this file while the other changed it. Keeping the deletion removes it everywhere; keeping the edit brings it back everywhere.",
  },
  type: {
    count: (n) => `${n.toLocaleString("en-US")} file/folder ${n === 1 ? "mismatch" : "mismatches"}`,
    label: "A file on one computer, a folder on the other",
    explain:
      "The same name is a file on one computer and a folder on the other. Choose which one to keep everywhere.",
  },
  collision: {
    count: (n) => `${n.toLocaleString("en-US")} name ${n === 1 ? "clash" : "clashes"}`,
    label: "Names clash on this computer",
    explain:
      "Two names that differ only in letter case cannot both exist on this computer's file system. Choose the one to keep.",
  },
  "sqlite-writer": {
    count: (n) => `${n.toLocaleString("en-US")} ${n === 1 ? "database" : "databases"} written on both computers`,
    label: "Database written on both computers",
    explain:
      "A program on this computer was writing this database when the other computer's copy arrived, so this computer's copy was kept. Choose which copy to keep everywhere.",
  },
  "git-branch": {
    count: (n) => `${n.toLocaleString("en-US")} diverged ${n === 1 ? "branch" : "branches"}`,
    label: "Branch diverged",
    explain:
      "Both computers added different commits to this branch. Openbase Sync never moves a branch that has diverged, so neither computer's branch was changed. Merge or rebase in git on either computer; this conflict closes by itself once both computers point at the same commit.",
  },
};

export const kindInfo = (kind: string): ConflictKindInfo =>
  KIND_INFO[kind] ?? { label: kind, explain: "" };

export const kindCount = (kind: string, n: number) =>
  kindInfo(kind).count?.(n) ?? `${n.toLocaleString("en-US")} ${kind}`;

export const KIND_ORDER = [
  "content",
  "delete-edit",
  "type",
  "collision",
  "sqlite-writer",
  "git-branch",
];

/** Whether picking a side resolves it (branch divergence needs git). */
export const isResolvable = (conflict: SyncDaemonConflict) =>
  conflict.kind !== "git-branch";

const parentOf = (path: string) => {
  const index = path.lastIndexOf("/");
  return index < 0 ? "" : path.slice(0, index);
};

/** The repository or folder a conflict belongs to (root-relative). */
export const conflictGroupName = (conflict: SyncDaemonConflict) => {
  if (conflict.group !== undefined) return conflict.group;
  if (conflict.kind === "git-branch" && conflict.path.includes(":")) {
    const repo = conflict.path.split(":")[0];
    return repo === "." ? "" : repo;
  }
  return parentOf(conflict.path);
};

export const conflictRef = (conflict: SyncDaemonConflict) => {
  if (conflict.ref) return conflict.ref;
  if (conflict.kind === "git-branch" && conflict.path.includes(":")) {
    return conflict.path.slice(conflict.path.indexOf(":") + 1);
  }
  return "";
};

/** What to show for a conflict inside its group. */
export const conflictItemName = (conflict: SyncDaemonConflict) => {
  if (conflict.kind === "git-branch") {
    const ref = conflictRef(conflict);
    if (ref.startsWith("refs/heads/")) {
      return `branch ${ref.slice("refs/heads/".length)}`;
    }
    if (ref === "refs/stash") return "stash";
    return ref || conflict.path;
  }
  const group = conflictGroupName(conflict);
  return group && conflict.path.startsWith(`${group}/`)
    ? conflict.path.slice(group.length + 1)
    : conflict.path;
};

export const conflictCreatedAt = (conflict: SyncDaemonConflict) =>
  conflict.created_ns ? new Date(conflict.created_ns / 1e6) : null;

export type ConflictFilter = {
  kind: string; // "all" or a kind
  query: string;
};

export const filterConflicts = (
  conflicts: SyncDaemonConflict[],
  filter: ConflictFilter,
) => {
  const query = filter.query.trim().toLowerCase();
  return conflicts.filter((conflict) => {
    if (filter.kind !== "all" && conflict.kind !== filter.kind) return false;
    if (!query) return true;
    return (
      conflict.path.toLowerCase().includes(query) ||
      (conflict.label ?? "").toLowerCase().includes(query) ||
      conflict.b_device.toLowerCase().includes(query) ||
      kindInfo(conflict.kind).label.toLowerCase().includes(query)
    );
  });
};

export type ConflictGroup = {
  key: string;
  root: string;
  rootPath: string;
  name: string;
  conflicts: SyncDaemonConflict[];
  kinds: [string, number][];
  resolvable: number;
  newestNs: number;
};

/** Groups by root and repository/folder, largest group first. */
export const groupConflicts = (
  conflicts: SyncDaemonConflict[],
): ConflictGroup[] => {
  const groups = new Map<string, ConflictGroup>();
  for (const conflict of conflicts) {
    const name = conflictGroupName(conflict);
    const key = `${conflict.root}\u0000${name}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        root: conflict.root,
        rootPath: conflict.root_path ?? "",
        name,
        conflicts: [],
        kinds: [],
        resolvable: 0,
        newestNs: 0,
      };
      groups.set(key, group);
    }
    group.conflicts.push(conflict);
    if (isResolvable(conflict)) group.resolvable += 1;
    group.newestNs = Math.max(group.newestNs, conflict.created_ns || 0);
  }
  for (const group of groups.values()) {
    const counts = new Map<string, number>();
    for (const conflict of group.conflicts) {
      counts.set(conflict.kind, (counts.get(conflict.kind) ?? 0) + 1);
    }
    group.kinds = [...counts.entries()].sort(
      (a, b) => KIND_ORDER.indexOf(a[0]) - KIND_ORDER.indexOf(b[0]),
    );
    group.conflicts.sort(
      (a, b) =>
        conflictItemName(a).localeCompare(conflictItemName(b)) || a.id - b.id,
    );
  }
  return [...groups.values()].sort(
    (a, b) =>
      b.conflicts.length - a.conflicts.length ||
      a.name.localeCompare(b.name) ||
      a.root.localeCompare(b.root),
  );
};

export const kindCounts = (conflicts: SyncDaemonConflict[]) => {
  const counts = new Map<string, number>();
  for (const conflict of conflicts) {
    counts.set(conflict.kind, (counts.get(conflict.kind) ?? 0) + 1);
  }
  return [...counts.entries()].sort(
    (a, b) => KIND_ORDER.indexOf(a[0]) - KIND_ORDER.indexOf(b[0]),
  );
};
