import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { Radio } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const POLL_MS = 5000;

export type SyncDaemonSettings = {
  configured: boolean;
  reachable?: boolean;
  role?: string;
  device_id?: string;
  sync_group?: string;
  peer_hot?: string;
  listen_hot?: string;
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
  const [unreachable, setUnreachable] = useState(false);
  const [resolving, setResolving] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch("/api/sync/daemon/settings/");
      if (!res.ok) return;
      const data = (await res.json()) as SyncDaemonSettings;
      setSettings(data);
      if (!data.configured) return;
      const [statusRes, conflictsRes] = await Promise.all([
        apiFetch("/api/sync/daemon/status/"),
        apiFetch("/api/sync/daemon/conflicts/"),
      ]);
      if (!statusRes.ok) {
        setUnreachable(true);
        return;
      }
      setUnreachable(false);
      setStatus((await statusRes.json()) as SyncDaemonStatus);
      if (conflictsRes.ok) {
        const payload = (await conflictsRes.json()) as {
          conflicts: SyncDaemonConflict[];
        };
        setConflicts(payload.conflicts ?? []);
      }
    } catch {
      // the next poll retries
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

  if (!settings) return null;
  if (!settings.configured) {
    return (
      <Panel className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Openbase Sync</h2>
          <Badge variant="outline">not configured</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          The hub/edge mirror daemon is not set up on this computer. Configure
          it with <code>openbase-coder sync-daemon configure</code>.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Radio className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Openbase Sync</h2>
        <Badge variant="outline">{settings.role ?? "?"}</Badge>
        {unreachable ? (
          <Badge variant="destructive">daemon not answering</Badge>
        ) : status?.peers?.length ? (
          <Badge>connected</Badge>
        ) : (
          <Badge variant="secondary">waiting for peer</Badge>
        )}
      </div>
      {status ? (
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <div className="text-muted-foreground">Roots</div>
            <ul className="space-y-1">
              {status.roots.map((root) => (
                <li key={root.id} className="font-mono text-xs">
                  {root.path}{" "}
                  <span className="text-muted-foreground">
                    · {root.entries.toLocaleString()} entries
                    {root.pending_fetches > 0
                      ? ` · ${root.pending_fetches} transferring`
                      : ""}
                    {root.scanning ? " · scanning" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
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
        </div>
      ) : null}
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
    </Panel>
  );
};
