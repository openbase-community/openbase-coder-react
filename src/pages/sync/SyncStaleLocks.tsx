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
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import React, { useState } from "react";
import { toast } from "sonner";
import { formatAgo, formatDuration, plural } from "./syncHealth";
import type { SyncStaleLock, SyncStaleLocksResponse } from "./syncTypes";

const displayRepo = (repo: string, home: string | null) =>
  home && repo.startsWith(`${home}/`) ? `~/${repo.slice(home.length + 1)}` : repo;

/** Git lock files left by a git process that died, with a safe way out. */
export const SyncStaleLocks: React.FC<{
  data: SyncStaleLocksResponse | null;
  onChanged: () => void | Promise<void>;
  onRefresh: () => void;
  home?: string | null;
  now?: number;
}> = ({ data, onChanged, onRefresh, home = null, now = Date.now() }) => {
  const [confirm, setConfirm] = useState<SyncStaleLock | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  const move = async (lock: SyncStaleLock) => {
    setMoving(lock.path);
    try {
      const res = await apiFetch("/api/sync/daemon/stale-locks/trash/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: lock.path }),
      });
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Unable to move the lock."));
      }
      const payload = (await res.json()) as { to: string };
      toast.success(`Moved the lock to ${payload.to}.`);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to move the lock.");
    } finally {
      setMoving(null);
    }
  };

  const locks = data?.locks ?? null;
  const staleAfter = data?.stale_after_s ?? 600;
  const checked = formatAgo(data?.checked_at, now);

  return (
    <div className="space-y-2" id="sync-stale-locks">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">
          {locks === null
            ? "Stale git locks"
            : locks.length
              ? plural(locks.length, "stale git lock")
              : "No stale git locks"}
        </h3>
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {data?.refreshing
            ? "Checking repositories…"
            : checked
              ? `Checked ${checked}`
              : null}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            disabled={!data || data.refreshing}
            onClick={onRefresh}
          >
            Check again
          </Button>
        </span>
      </div>
      {data?.error ? (
        <p className="text-[11px] text-destructive">
          The last check failed: {data.error}
        </p>
      ) : null}
      {locks === null ? (
        <p className="text-[11px] text-muted-foreground">
          Openbase Sync is checking your repositories; on a large tree this
          takes a few minutes.
        </p>
      ) : locks.length ? (
        <>
          <p className="text-[11px] text-muted-foreground">
            A git process died and left each of these lock files behind. Git
            commands in that repository fail until the lock is removed, and
            Openbase Sync cannot replicate its commits and branches meanwhile.
          </p>
          <ul className="space-y-1">
            {locks.map((lock) => {
              const oldEnough = lock.exists && (lock.age_s ?? 0) >= staleAfter;
              return (
                <li
                  key={lock.path}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border p-2"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs">
                      {displayRepo(lock.repo, home)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {lock.name}
                      {lock.exists
                        ? lock.age_s != null
                          ? ` · left ${formatDuration(lock.age_s)} ago`
                          : ""
                        : " · already gone"}
                    </div>
                  </div>
                  {oldEnough ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={moving !== null}
                      onClick={() => setConfirm(lock)}
                    >
                      {moving === lock.path ? "Moving…" : "Move lock to Openbase trash"}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move this git lock to the Openbase trash?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.path} moves to ~/.openbase/trash; nothing is deleted.
              Openbase first checks that the lock is over 10 minutes old and that
              no running process holds it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm) void move(confirm);
                setConfirm(null);
              }}
            >
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
