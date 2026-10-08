import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { ChevronDown, ChevronRight, GitBranch, Sparkles } from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConflictDetail } from "./ConflictDetail";
import {
  conflictCreatedAt,
  conflictItemName,
  filterConflicts,
  groupConflicts,
  isResolvable,
  kindCount,
  kindCounts,
  kindInfo,
  type ConflictGroup,
} from "./conflictGroups";
import { formatAgo, formatCount, plural } from "./syncHealth";
import type { SyncDaemonConflict } from "./syncTypes";

export const GROUPS_PER_PAGE = 20;
export const ROWS_PER_GROUP = 50;
const BULK_CHUNK = 100;

type Action = "keep_local" | "use_remote";

const choiceLabels = (conflict: SyncDaemonConflict, other: string) => {
  if (conflict.kind === "delete-edit" && !conflict.a_hash) {
    return { keep: "Keep it deleted", take: `Restore ${other}'s version` };
  }
  if (conflict.kind === "delete-edit" && !conflict.b_hash) {
    return { keep: "Keep this computer's", take: `Delete it, as on ${other}` };
  }
  return { keep: "Keep this computer's", take: `Take ${other}'s` };
};

const resolveRequest = async (body: Record<string, unknown>) => {
  const res = await apiFetch("/api/sync/daemon/conflicts/resolve/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, "Unable to resolve."));
  }
  return res.json();
};

const ConflictRow: React.FC<{
  conflict: SyncDaemonConflict;
  otherName: (device: string) => string;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  open: boolean;
  onToggle: () => void;
  busy: boolean;
  onResolve: (action: Action) => void;
  now: number;
}> = ({
  conflict,
  otherName,
  selected,
  onSelect,
  open,
  onToggle,
  busy,
  onResolve,
  now,
}) => {
  const other = otherName(conflict.b_device);
  const resolvable = isResolvable(conflict);
  const labels = choiceLabels(conflict, other);
  const created = conflictCreatedAt(conflict);
  const ago = created ? formatAgo(created.toISOString(), now) : null;
  const name = conflictItemName(conflict);
  return (
    <li className="rounded border">
      <div className="flex flex-wrap items-center gap-2 p-2 text-sm">
        <input
          type="checkbox"
          className="h-3.5 w-3.5"
          aria-label={`Select ${name}`}
          checked={selected}
          disabled={!resolvable || busy}
          title={
            resolvable ? undefined : "Branch conflicts are resolved in git"
          }
          onChange={(event) => onSelect(event.target.checked)}
        />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-1 text-left"
          aria-expanded={open}
          onClick={onToggle}
        >
          {open ? (
            <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span className="min-w-0">
            <span className="block truncate font-mono text-xs">{name}</span>
            <span className="block text-[11px] text-muted-foreground">
              {kindInfo(conflict.kind).label} · this computer vs {other}
              {ago ? ` · ${ago}` : ""}
            </span>
          </span>
        </button>
        {conflict.label ? (
          <Badge
            variant="outline"
            className="max-w-full gap-1 text-[10px] font-normal"
            title="Openbase's suggestion"
          >
            <Sparkles className="h-3 w-3" />
            {conflict.label}
          </Badge>
        ) : null}
        {resolvable ? (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={busy}
              onClick={() => onResolve("keep_local")}
            >
              {labels.keep}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={busy}
              onClick={() => onResolve("use_remote")}
            >
              {labels.take}
            </Button>
          </div>
        ) : (
          <Badge variant="secondary" className="gap-1 text-[10px] font-normal">
            <GitBranch className="h-3 w-3" /> resolve in git
          </Badge>
        )}
      </div>
      {open ? <ConflictDetail conflict={conflict} otherName={other} /> : null}
    </li>
  );
};

const GroupBlock: React.FC<{
  group: ConflictGroup;
  expanded: boolean;
  onExpand: () => void;
  rowsShown: number;
  onShowMore: () => void;
  selected: Set<number>;
  setSelected: (ids: number[], value: boolean) => void;
  openId: number | null;
  setOpenId: (id: number | null) => void;
  busyIds: Set<number>;
  onResolve: (conflict: SyncDaemonConflict, action: Action) => void;
  otherName: (device: string) => string;
  now: number;
}> = ({
  group,
  expanded,
  onExpand,
  rowsShown,
  onShowMore,
  selected,
  setSelected,
  openId,
  setOpenId,
  busyIds,
  onResolve,
  otherName,
  now,
}) => {
  const resolvableIds = group.conflicts
    .filter(isResolvable)
    .map((conflict) => conflict.id);
  const selectedHere = resolvableIds.filter((id) => selected.has(id)).length;
  const title = group.name || "(top level)";
  return (
    <li className="rounded border">
      <div className="flex flex-wrap items-center gap-2 p-2">
        <input
          type="checkbox"
          className="h-3.5 w-3.5"
          aria-label={`Select all in ${title}`}
          disabled={resolvableIds.length === 0}
          checked={resolvableIds.length > 0 && selectedHere === resolvableIds.length}
          ref={(element) => {
            if (element) {
              element.indeterminate =
                selectedHere > 0 && selectedHere < resolvableIds.length;
            }
          }}
          onChange={(event) => setSelected(resolvableIds, event.target.checked)}
        />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1 text-left"
          aria-expanded={expanded}
          onClick={onExpand}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="min-w-0">
            <span className="block truncate font-mono text-xs" title={group.rootPath ? `${group.rootPath}/${group.name}` : group.name}>
              {title}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {group.kinds
                .map(([kind, count]) => kindCount(kind, count))
                .join(" · ")}
            </span>
          </span>
        </button>
        <Badge variant="outline" className="text-[11px]">
          {formatCount(group.conflicts.length)}
        </Badge>
      </div>
      {expanded ? (
        <div className="space-y-1 border-t p-2">
          <ul className="space-y-1">
            {group.conflicts.slice(0, rowsShown).map((conflict) => (
              <ConflictRow
                key={conflict.id}
                conflict={conflict}
                otherName={otherName}
                selected={selected.has(conflict.id)}
                onSelect={(value) => setSelected([conflict.id], value)}
                open={openId === conflict.id}
                onToggle={() =>
                  setOpenId(openId === conflict.id ? null : conflict.id)
                }
                busy={busyIds.has(conflict.id)}
                onResolve={(action) => onResolve(conflict, action)}
                now={now}
              />
            ))}
          </ul>
          {group.conflicts.length > rowsShown ? (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onShowMore}>
              Show {formatCount(Math.min(ROWS_PER_GROUP, group.conflicts.length - rowsShown))} more
              of {formatCount(group.conflicts.length - rowsShown)}
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
};

/**
 * Open conflicts, grouped by repository or folder, with search, a kind
 * filter, paging, per-conflict details and bulk resolution.
 */
export const SyncConflicts: React.FC<{
  conflicts: SyncDaemonConflict[];
  otherName: (device: string) => string;
  onChanged: () => void | Promise<void>;
  now?: number;
}> = ({ conflicts, otherName, onChanged, now = Date.now() }) => {
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [rowsShown, setRowsShown] = useState<Record<string, number>>({});
  const [selected, setSelectedState] = useState<Set<number>>(new Set());
  const [openId, setOpenId] = useState<number | null>(null);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [bulk, setBulk] = useState<{ action: Action; ids: number[] } | null>(null);
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);

  const kinds = useMemo(() => kindCounts(conflicts), [conflicts]);
  // a kind whose last conflict was resolved falls back to all kinds
  const activeKind =
    kind !== "all" && !kinds.some(([k]) => k === kind) ? "all" : kind;
  const filtered = useMemo(
    () => filterConflicts(conflicts, { kind: activeKind, query }),
    [conflicts, activeKind, query],
  );
  const groups = useMemo(() => groupConflicts(filtered), [filtered]);
  const pages = Math.max(1, Math.ceil(groups.length / GROUPS_PER_PAGE));
  const currentPage = Math.min(page, pages - 1);
  const pageGroups = groups.slice(
    currentPage * GROUPS_PER_PAGE,
    (currentPage + 1) * GROUPS_PER_PAGE,
  );
  // a group search narrowed to a single group opens it
  const autoExpand = groups.length === 1 ? groups[0].key : null;

  const openIds = useMemo(
    () => new Set(conflicts.map((conflict) => conflict.id)),
    [conflicts],
  );
  // selections of conflicts that were resolved meanwhile drop out
  const selectedOpen = useMemo(
    () => new Set([...selected].filter((id) => openIds.has(id))),
    [selected, openIds],
  );
  const filteredResolvable = filtered.filter(isResolvable).map((c) => c.id);
  const selectedShown = filteredResolvable.filter((id) => selectedOpen.has(id));

  const setSelected = (ids: number[], value: boolean) => {
    setSelectedState((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (value) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const resolveOne = async (conflict: SyncDaemonConflict, action: Action) => {
    setBusyIds((current) => new Set(current).add(conflict.id));
    try {
      await resolveRequest({ id: conflict.id, action });
      toast.success(
        action === "keep_local"
          ? "Kept this computer's version."
          : `Took ${otherName(conflict.b_device)}'s version.`,
      );
      setSelected([conflict.id], false);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to resolve.");
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(conflict.id);
        return next;
      });
    }
  };

  const runBulk = async (action: Action, ids: number[]) => {
    setBusyIds(new Set(ids));
    let resolved = 0;
    const failures: string[] = [];
    try {
      for (let start = 0; start < ids.length; start += BULK_CHUNK) {
        setBulkProgress(
          `Resolving ${formatCount(Math.min(start + BULK_CHUNK, ids.length))} of ${formatCount(ids.length)}…`,
        );
        const chunk = ids.slice(start, start + BULK_CHUNK);
        const payload = (await resolveRequest({ ids: chunk, action })) as {
          resolved: number;
          results: { id: number; ok: boolean; error: string | null }[];
        };
        resolved += payload.resolved;
        for (const result of payload.results) {
          if (!result.ok && result.error) failures.push(result.error);
        }
      }
    } catch (err) {
      failures.push(err instanceof Error ? err.message : "Unable to resolve.");
    } finally {
      setBusyIds(new Set());
      setBulkProgress(null);
      setSelected(ids, false);
    }
    if (resolved) toast.success(`Resolved ${plural(resolved, "conflict")}.`);
    if (failures.length) {
      toast.error(
        `${plural(failures.length, "conflict")} not resolved: ${failures[0]}`,
      );
    }
    await onChanged();
  };

  if (conflicts.length === 0) {
    return (
      <p className="text-xs text-muted-foreground" id="sync-conflicts">
        No conflicts.
      </p>
    );
  }

  const branchCount = conflicts.filter((c) => !isResolvable(c)).length;

  return (
    <div className="space-y-2" id="sync-conflicts">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">
          {plural(conflicts.length, "conflict")}
        </h3>
        <span className="text-[11px] text-muted-foreground">
          {kinds.map(([k, n]) => kindCount(k, n)).join(" · ")}
        </span>
      </div>
      {branchCount ? (
        <p className="text-[11px] text-muted-foreground">
          {plural(branchCount, "branch conflict")}: neither computer's branch
          was moved. Merge or rebase in git; each closes by itself once both
          computers point at the same commit. Open one for the commands.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          placeholder="Search paths, computers, labels"
          aria-label="Search conflicts"
          className="h-8 max-w-xs text-xs"
        />
        <select
          aria-label="Conflict kind"
          className="h-8 rounded border bg-background px-2 text-xs"
          value={activeKind}
          onChange={(event) => {
            setKind(event.target.value);
            setPage(0);
          }}
        >
          <option value="all">All kinds ({formatCount(conflicts.length)})</option>
          {kinds.map(([k, n]) => (
            <option key={k} value={k}>
              {kindInfo(k).label} ({formatCount(n)})
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            className="h-3.5 w-3.5"
            aria-label="Select all shown"
            disabled={filteredResolvable.length === 0}
            checked={
              filteredResolvable.length > 0 &&
              selectedShown.length === filteredResolvable.length
            }
            onChange={(event) =>
              setSelected(filteredResolvable, event.target.checked)
            }
          />
          Select all {formatCount(filteredResolvable.length)} that can be
          picked
        </label>
      </div>

      {selectedOpen.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded border border-warning/40 bg-warning/5 p-2 text-xs">
          <span className="font-medium">
            {plural(selectedOpen.size, "conflict")} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={bulkProgress !== null}
            onClick={() => setBulk({ action: "keep_local", ids: [...selectedOpen] })}
          >
            Keep this computer's versions
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={bulkProgress !== null}
            onClick={() => setBulk({ action: "use_remote", ids: [...selectedOpen] })}
          >
            Take the other computer's versions
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            disabled={bulkProgress !== null}
            onClick={() => setSelectedState(new Set())}
          >
            Clear selection
          </Button>
          {bulkProgress ? (
            <span className="text-muted-foreground">{bulkProgress}</span>
          ) : null}
        </div>
      ) : null}

      {groups.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No conflicts match this filter.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {pageGroups.map((group) => (
            <GroupBlock
              key={group.key}
              group={group}
              expanded={expanded.has(group.key) || autoExpand === group.key}
              onExpand={() =>
                setExpanded((current) => {
                  const next = new Set(current);
                  if (next.has(group.key)) next.delete(group.key);
                  else next.add(group.key);
                  return next;
                })
              }
              rowsShown={rowsShown[group.key] ?? ROWS_PER_GROUP}
              onShowMore={() =>
                setRowsShown((current) => ({
                  ...current,
                  [group.key]: (current[group.key] ?? ROWS_PER_GROUP) + ROWS_PER_GROUP,
                }))
              }
              selected={selectedOpen}
              setSelected={setSelected}
              openId={openId}
              setOpenId={setOpenId}
              busyIds={busyIds}
              onResolve={(conflict, action) => void resolveOne(conflict, action)}
              otherName={otherName}
              now={now}
            />
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>
            Groups {formatCount(currentPage * GROUPS_PER_PAGE + 1)}–
            {formatCount(Math.min(groups.length, (currentPage + 1) * GROUPS_PER_PAGE))} of{" "}
            {formatCount(groups.length)} ({plural(filtered.length, "conflict")})
          </span>
          <span className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={currentPage >= pages - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </span>
        </div>
      ) : null}

      <AlertDialog open={bulk !== null} onOpenChange={(open) => !open && setBulk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulk?.action === "keep_local"
                ? `Keep this computer's version of ${plural(bulk?.ids.length ?? 0, "conflict")}?`
                : `Take the other computer's version of ${plural(bulk?.ids.length ?? 0, "conflict")}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulk?.action === "keep_local"
                ? "For each selected conflict, this computer's current version (or its deletion) is sent to the other computer and replaces its version."
                : "For each selected conflict, the other computer's version (or its deletion) replaces this computer's. Where this computer's file changed again after the conflict was recorded, the conflict is closed and the file is left as it is."}{" "}
              Openbase Sync keeps a copy of both versions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (bulk) void runBulk(bulk.action, bulk.ids);
                setBulk(null);
              }}
            >
              Resolve {plural(bulk?.ids.length ?? 0, "conflict")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
