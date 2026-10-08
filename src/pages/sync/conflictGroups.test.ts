import { describe, expect, it } from "vitest";
import {
  conflictItemName,
  filterConflicts,
  groupConflicts,
  isResolvable,
} from "./conflictGroups";
import type { SyncDaemonConflict } from "./syncTypes";

const conflict = (
  id: number,
  path: string,
  kind: string,
  extra: Partial<SyncDaemonConflict> = {},
): SyncDaemonConflict => ({
  id,
  root: "projects",
  path,
  kind,
  a_device: "laptop",
  b_device: "mini",
  created_ns: id,
  ...extra,
});

describe("groupConflicts", () => {
  it("groups by the repository the API reports, largest first", () => {
    const groups = groupConflicts([
      conflict(1, "ws/cli:refs/heads/staging", "git-branch", { group: "ws/cli" }),
      conflict(2, "ws/cli/pkg/_version.py", "content", { group: "ws/cli" }),
      conflict(3, "notes/a.md", "content", { group: "notes" }),
      conflict(4, "ws/cli:refs/stash", "git-branch", { group: "ws/cli" }),
    ]);

    expect(groups.map((group) => [group.name, group.conflicts.length])).toEqual([
      ["ws/cli", 3],
      ["notes", 1],
    ]);
    expect(groups[0].kinds).toEqual([
      ["content", 1],
      ["git-branch", 2],
    ]);
    expect(groups[0].resolvable).toBe(1);
  });

  it("falls back to the parent folder or repository without API grouping", () => {
    const [branch, file] = [
      conflict(1, "app:refs/heads/main", "git-branch"),
      conflict(2, "app/src/x.ts", "content"),
    ];
    const groups = groupConflicts([branch, file]);
    expect(groups.map((group) => group.name).sort()).toEqual(["app", "app/src"]);
    expect(conflictItemName(branch)).toBe("branch main");
    expect(conflictItemName(file)).toBe("x.ts");
  });

  it("scales to thousands", () => {
    const many = Array.from({ length: 5000 }, (_, index) =>
      conflict(index, `repo${index % 40}/file${index}.txt`, "content", {
        group: `repo${index % 40}`,
      }),
    );
    const started = performance.now();
    const groups = groupConflicts(many);
    expect(groups).toHaveLength(40);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe("filterConflicts", () => {
  const all = [
    conflict(1, "a/uv.lock", "content", { label: "keep newer lockfile" }),
    conflict(2, "a:refs/heads/x", "git-branch"),
    conflict(3, "b/data.db", "sqlite-writer", { b_device: "studio" }),
  ];

  it("filters by kind and by text in path, label, computer or kind", () => {
    expect(filterConflicts(all, { kind: "git-branch", query: "" })).toHaveLength(1);
    expect(filterConflicts(all, { kind: "all", query: "newer" })[0].id).toBe(1);
    expect(filterConflicts(all, { kind: "all", query: "studio" })[0].id).toBe(3);
    expect(filterConflicts(all, { kind: "all", query: "database" })[0].id).toBe(3);
  });

  it("never offers file choices for diverged branches", () => {
    expect(all.filter(isResolvable).map((c) => c.id)).toEqual([1, 3]);
  });
});
