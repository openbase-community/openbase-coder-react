import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { Radio } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SyncComputers } from "./SyncComputers";
import { SyncConflicts } from "./SyncConflicts";
import { SyncFolders } from "./SyncFolders";
import { SyncPairingSetup } from "./SyncPairingSetup";
import { SyncStaleLocks } from "./SyncStaleLocks";
import { SyncStatusBanner } from "./SyncStatusBanner";
import { withRestartNote } from "./restartNote";
import {
  backlogOf,
  backlogProgress,
  describeHealth,
  overviewOf,
  trackBacklog,
  type BacklogTrack,
} from "./syncHealth";
import type {
  SyncDaemonConflict,
  SyncDaemonSettings,
  SyncDaemonStatus,
  SyncStaleLocksResponse,
} from "./syncTypes";

export type {
  SyncDaemonConflict,
  SyncDaemonPeer,
  SyncDaemonSettings,
  SyncDaemonStatus,
} from "./syncTypes";

/** Status is cheap to ask for; conflicts and lock scans less so. */
export const POLL_MS = 5000;
export const CONFLICTS_EVERY = 3; // polls (15 s)
export const STALE_LOCKS_EVERY = 12; // polls (60 s)

/** The home directory, from a root configured as `~/x` and served as `/…/x`. */
const homeFrom = (
  settings: SyncDaemonSettings | null,
  status: SyncDaemonStatus | null,
) => {
  for (const root of settings?.roots ?? []) {
    if (!root.id || !root.path?.startsWith("~/")) continue;
    const live = status?.roots?.find((entry) => entry.id === root.id);
    const suffix = root.path.slice(1);
    if (live?.path?.endsWith(suffix)) {
      return live.path.slice(0, live.path.length - suffix.length);
    }
  }
  return null;
};

export const SyncDaemonCard: React.FC = () => {
  const [settings, setSettings] = useState<SyncDaemonSettings | null>(null);
  const [status, setStatus] = useState<SyncDaemonStatus | null>(null);
  const [conflicts, setConflicts] = useState<SyncDaemonConflict[]>([]);
  const [staleLocks, setStaleLocks] = useState<SyncStaleLocksResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const backlog = useRef<BacklogTrack>({ samples: [], peak: 0 });
  const tick = useRef(0);
  const lockScanRunning = useRef(false);

  const loadConflicts = useCallback(async () => {
    const res = await apiFetch("/api/sync/daemon/conflicts/");
    if (!res.ok) return;
    const payload = (await res.json()) as {
      conflicts: SyncDaemonConflict[] | null;
    };
    setConflicts(payload.conflicts ?? []);
  }, []);

  const loadStaleLocks = useCallback(async (refresh = false) => {
    const res = await apiFetch(
      `/api/sync/daemon/stale-locks/${refresh ? "?refresh=1" : ""}`,
    );
    if (!res.ok) return;
    const payload = (await res.json()) as SyncStaleLocksResponse;
    lockScanRunning.current = payload.refreshing;
    setStaleLocks(payload);
  }, []);

  const refresh = useCallback(
    async ({ all = false }: { all?: boolean } = {}) => {
      const count = tick.current++;
      try {
        const res = await apiFetch("/api/sync/daemon/settings/");
        if (!res.ok) {
          throw new Error(
            await extractErrorMessage(
              res,
              "Unable to load Openbase Sync status.",
            ),
          );
        }
        const data = (await res.json()) as SyncDaemonSettings;
        setSettings(data);
        setError(null);
        setNow(Date.now());
        if (!data.configured) {
          setStatus(null);
          setConflicts([]);
          setStaleLocks(null);
          setUnreachable(false);
          return;
        }
        const statusRes = await apiFetch("/api/sync/daemon/status/");
        if (!statusRes.ok) {
          setUnreachable(true);
          setStatus(null);
          setConflicts([]);
          return;
        }
        setUnreachable(false);
        // The daemon sends null (not []) for empty lists, e.g. a new hub with
        // no edge connected yet.
        const rawStatus = (await statusRes.json()) as SyncDaemonStatus;
        const next = {
          ...rawStatus,
          roots: rawStatus.roots ?? [],
          peers: rawStatus.peers ?? [],
        };
        backlog.current = trackBacklog(backlog.current, {
          at: Date.now(),
          backlog: backlogOf(overviewOf(next)),
        });
        setStatus(next);
        const loads: Promise<void>[] = [];
        if (all || count % CONFLICTS_EVERY === 0) loads.push(loadConflicts());
        if (
          all ||
          lockScanRunning.current ||
          count % STALE_LOCKS_EVERY === 0
        ) {
          loads.push(loadStaleLocks());
        }
        await Promise.all(loads);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load Openbase Sync status.",
        );
      } finally {
        setLoading(false);
      }
    },
    [loadConflicts, loadStaleLocks],
  );

  const refreshAll = useCallback(() => refresh({ all: true }), [refresh]);

  useEffect(() => {
    void refresh({ all: true });
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const leave = async () => {
    setLeaving(true);
    try {
      const res = await apiFetch("/api/sync/daemon/pairing/leave/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Unable to stop syncing."),
        );
      }
      toast.success(
        await withRestartNote(
          res,
          "Stopped syncing on this computer. Your files were not changed.",
        ),
      );
      await refreshAll();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to stop syncing.",
      );
    } finally {
      setLeaving(false);
    }
  };

  const overview = useMemo(
    () => (status && !unreachable ? overviewOf(status) : null),
    [status, unreachable],
  );
  const hubDevice =
    status?.peers?.find((peer) => peer.role === "hub")?.device ??
    overview?.offline_peers.find((peer) => peer.role === "hub")?.device ??
    null;
  // the paired computer's name, else its sync device id, else its address
  const hubLabel = settings?.hub_is_self
    ? null
    : (settings?.hub_name ?? hubDevice ?? settings?.hub_host ?? null);
  const peerName = useCallback(
    (device: string) =>
      hubLabel && device === hubDevice ? hubLabel : device,
    [hubLabel, hubDevice],
  );
  const staleLockCount =
    staleLocks?.locks?.length ?? overview?.attention.stale_locks ?? null;
  const shownOverview = overview
    ? {
        ...overview,
        attention: {
          ...overview.attention,
          conflicts: Math.max(overview.attention.conflicts, conflicts.length),
          stale_locks: staleLockCount,
        },
      }
    : null;
  const health = describeHealth({
    overview: shownOverview,
    unreachable,
    hubLabel,
    progress: overview ? backlogProgress(backlog.current) : null,
    now,
  });

  if (loading && !settings) {
    return (
      <Panel className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Openbase Sync</h2>
          <Badge variant="outline">loading</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Loading Openbase Sync...
        </p>
      </Panel>
    );
  }
  if (!settings) {
    return (
      <Panel className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Openbase Sync</h2>
          <Badge variant="destructive">unavailable</Badge>
        </div>
        <p className="text-sm text-destructive">
          {error ?? "Unable to load Openbase Sync status."}
        </p>
      </Panel>
    );
  }
  if (!settings.configured) {
    return <SyncPairingSetup onChanged={refreshAll} />;
  }

  return (
    <Panel className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Radio className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Openbase Sync</h2>
        <Badge variant="outline">
          {settings.role === "hub"
            ? "always-on (hub)"
            : settings.role === "edge"
              ? "edge"
              : (settings.role ?? "?")}
        </Badge>
        {unreachable ? (
          <Badge variant="destructive">daemon not answering</Badge>
        ) : status?.peers?.length ? (
          <Badge>connected</Badge>
        ) : (
          <Badge variant="secondary">waiting for peer</Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {settings.role === "hub"
          ? "This is your always-on computer. Your other computers sync with it."
          : hubLabel
            ? `Syncing with ${hubLabel}, your always-on computer.`
            : "Syncing with your always-on computer."}
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <SyncStatusBanner
        health={health}
        attention={
          shownOverview
            ? {
                conflicts: shownOverview.attention.conflicts,
                staleLocks: shownOverview.attention.stale_locks,
              }
            : undefined
        }
      />
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <SyncFolders
          roots={settings.roots}
          status={overview?.roots}
          peerName={peerName}
          onChanged={refreshAll}
        />
        {status ? (
          <SyncComputers
            role={settings.role}
            peers={status.peers}
            overview={overview}
            hubLabel={hubLabel}
            peerName={peerName}
            now={now}
          />
        ) : null}
      </div>
      {status && !unreachable ? (
        <div className="border-t pt-3">
          <SyncConflicts
            conflicts={conflicts}
            otherName={peerName}
            onChanged={refreshAll}
            now={now}
          />
        </div>
      ) : null}
      {status && !unreachable ? (
        <div className="border-t pt-3">
          <SyncStaleLocks
            data={staleLocks}
            home={homeFrom(settings, status)}
            onChanged={() => loadStaleLocks()}
            onRefresh={() => void loadStaleLocks(true)}
            now={now}
          />
        </div>
      ) : null}
      <div className="border-t pt-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" disabled={leaving}>
              {leaving ? "Stopping…" : "Stop syncing on this computer"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Stop syncing on this computer?</AlertDialogTitle>
              <AlertDialogDescription>
                {settings.role === "hub"
                  ? "Your other computers will stop syncing with it. "
                  : ""}
                Files already here stay where they are. You can set up sync
                again later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => void leave()}>
                Stop syncing
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Panel>
  );
};
