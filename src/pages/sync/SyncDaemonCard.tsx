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
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SyncFolders } from "./SyncFolders";
import { SyncPairingSetup } from "./SyncPairingSetup";

const POLL_MS = 5000;

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
  roots: { id?: string; path?: string }[];
};

export type SyncDaemonPeer = {
  device: string;
  role: string;
  rtt_ms: number;
  roots: Record<
    string,
    { sent_seq: number; acked_seq: number; applied_peer_seq: number }
  >;
};

export type SyncDaemonStatus = {
  device: string;
  role: string;
  uptime_s: number;
  roots: {
    id: string;
    path: string;
    entries: number;
    seq: number;
    pending_fetches: number;
    scanning: boolean;
  }[];
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
};

export type SyncDaemonConflict = {
  id: number;
  root: string;
  path: string;
  kind: string;
  a_device: string;
  b_device: string;
  created_ns: number;
  label?: string;
};

const kindLabel: Record<string, string> = {
  content: "Both sides edited",
  "delete-edit": "Deleted on one side, edited on the other",
  type: "File vs directory",
  collision: "Name collision",
  "sqlite-writer": "Database written on both sides",
  "git-branch": "Branch diverged",
};

export const SyncDaemonCard: React.FC = () => {
  const [settings, setSettings] = useState<SyncDaemonSettings | null>(null);
  const [status, setStatus] = useState<SyncDaemonStatus | null>(null);
  const [conflicts, setConflicts] = useState<SyncDaemonConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const [resolving, setResolving] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch("/api/sync/daemon/settings/");
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Unable to load Openbase Sync status."),
        );
      }
      const data = (await res.json()) as SyncDaemonSettings;
      setSettings(data);
      setError(null);
      if (!data.configured) {
        setStatus(null);
        setConflicts([]);
        setUnreachable(false);
        return;
      }
      const [statusRes, conflictsRes] = await Promise.all([
        apiFetch("/api/sync/daemon/status/"),
        apiFetch("/api/sync/daemon/conflicts/"),
      ]);
      if (!statusRes.ok) {
        setUnreachable(true);
        setStatus(null);
        setConflicts([]);
        return;
      }
      setUnreachable(false);
      setStatus((await statusRes.json()) as SyncDaemonStatus);
      if (conflictsRes.ok) {
        const payload = (await conflictsRes.json()) as {
          conflicts: SyncDaemonConflict[];
        };
        setConflicts(payload.conflicts ?? []);
      } else {
        setConflicts([]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Openbase Sync status.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const resolve = async (id: number, action: "keep_local" | "use_remote") => {
    setResolving(id);
    try {
      const res = await apiFetch("/api/sync/daemon/conflicts/resolve/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Unable to resolve."));
      }
      toast.success(
        action === "keep_local"
          ? "Kept this computer's version."
          : "Took the other computer's version.",
      );
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to resolve.");
    } finally {
      setResolving(null);
    }
  };

  const leave = async () => {
    setLeaving(true);
    try {
      const res = await apiFetch("/api/sync/daemon/pairing/leave/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Unable to stop syncing."));
      }
      toast.success("Stopped syncing on this computer. Your files were not changed.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to stop syncing.");
    } finally {
      setLeaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <Panel className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Openbase Sync</h2>
          <Badge variant="outline">loading</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Loading Openbase Sync...</p>
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
    return <SyncPairingSetup onChanged={refresh} />;
  }

  const hubLabel = settings.hub_is_self
    ? null
    : (settings.hub_name ?? settings.hub_host ?? null);

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
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <SyncFolders
          roots={settings.roots}
          status={status?.roots}
          onChanged={refresh}
        />
        {status ? (
          <div>
            <div className="text-muted-foreground">Peers</div>
            <ul className="space-y-1">
              {status.peers.length === 0 ? (
                <li className="text-xs text-muted-foreground">none</li>
              ) : (
                status.peers.map((peer) => (
                  <li key={peer.device} className="text-xs">
                    <span className="font-mono">{peer.device}</span> ({peer.role}
                    {peer.rtt_ms > 0 ? `, ${peer.rtt_ms.toFixed(0)} ms` : ""})
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </div>
      {conflicts.length > 0 ? (
        <div className="space-y-2">
          <div className="text-sm font-medium">
            {conflicts.length} conflict{conflicts.length === 1 ? "" : "s"}
          </div>
          <ul className="space-y-2">
            {conflicts.map((conflict) => (
              <li
                key={conflict.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs">
                    {conflict.path}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {kindLabel[conflict.kind] ?? conflict.kind}
                    {conflict.label ? ` · ${conflict.label}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resolving === conflict.id}
                    onClick={() => void resolve(conflict.id, "keep_local")}
                  >
                    Keep mine
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resolving === conflict.id}
                    onClick={() => void resolve(conflict.id, "use_remote")}
                  >
                    Take theirs
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : status && !unreachable ? (
        <p className="text-xs text-muted-foreground">No conflicts.</p>
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
