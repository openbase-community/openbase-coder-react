import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { X } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RESTART_NOTE } from "./restartNote";
import { formatBytes, formatCount, plural } from "./syncHealth";
import type { SyncAvailableRoots, SyncOverviewRoot, SyncRootDisk } from "./syncTypes";

export type SyncFolderRoot = {
  id?: string;
  path?: string;
  pins?: string[];
  ignore?: string[];
  /** Root-relative paths synced here (a project-only computer); absent: all. */
  only?: string[];
};

const peerBacklogLine = (
  peer: SyncOverviewRoot["peers"][number],
  peerName: (device: string) => string,
) => {
  const name = peerName(peer.device);
  const parts: string[] = [];
  if (peer.unsent) parts.push(`${formatCount(peer.unsent)} to send`);
  if (peer.unacked) parts.push(`${formatCount(peer.unacked)} awaiting confirmation`);
  const outgoing = parts.length ? parts.join(", ") : "all sent";
  return `${name}: ${outgoing} · received through change #${formatCount(peer.received_seq)}`;
};

type PeerResult = { name: string; ok: boolean; error: string | null };

type RemoveScope = "this_computer" | "everywhere";

const changeRoot = async (
  method: "POST" | "DELETE",
  path: string,
  fallback: string,
  scope?: RemoveScope,
): Promise<{ peers: PeerResult[]; note: string }> => {
  const res = await apiFetch("/api/sync/daemon/roots/", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scope ? { path, scope } : { path }),
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, fallback));
  }
  const payload = (await res.json()) as {
    peers?: PeerResult[];
    restart_required?: boolean;
  };
  return {
    peers: payload.peers ?? [],
    note: payload.restart_required ? RESTART_NOTE : "",
  };
};

const warnFailedPeers = (peers: PeerResult[]) => {
  for (const peer of peers) {
    if (!peer.ok) {
      toast.error(
        `Not updated on ${peer.name}: ${peer.error ?? "unknown error"}`,
      );
    }
  }
};

/** Free space and the floor sync never writes below, for one folder's disk. */
export const DiskNote: React.FC<{ disk: SyncRootDisk }> = ({ disk }) => {
  const low = disk.below_low_water || disk.held_files > 0;
  return (
    <div className={`pl-2 text-[11px] ${low ? "text-destructive" : "text-muted-foreground"}`}>
      {disk.free_bytes != null
        ? `Disk: ${formatBytes(disk.free_bytes)} free of ${formatBytes(disk.total_bytes)} · sync keeps ${formatBytes(disk.low_water_bytes)} free`
        : `Sync keeps ${formatBytes(disk.low_water_bytes)} free`}
      {low
        ? ` · Low disk: sync writes here are paused until space returns${
            disk.held_files
              ? ` (${plural(disk.held_files, "file")}, ${formatBytes(disk.held_bytes)} waiting)`
              : ""
          }`
        : ""}
    </div>
  );
};

/**
 * The synced folders, with add and remove. On the hub a change applies on
 * every computer. On a computer that syncs some of the hub's folders, the
 * hub's other folders can be added here, and a folder can stop syncing here
 * only (the default on a project-only computer) or everywhere.
 */
export const SyncFolders: React.FC<{
  roots: SyncFolderRoot[];
  status?: SyncOverviewRoot[];
  peerName?: (device: string) => string;
  role?: string;
  projectOnly?: boolean;
  onChanged: () => void | Promise<void>;
}> = ({
  roots,
  status,
  peerName = (device) => device,
  role,
  projectOnly = false,
  onChanged,
}) => {
  const [newPath, setNewPath] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [available, setAvailable] = useState<SyncAvailableRoots | null>(null);
  const statusById = new Map((status ?? []).map((root) => [root.id, root]));
  const edge = role === "edge";
  // the hub's folders not synced here, and on a project-only computer the
  // projects inside them (a folder synced in part lists its other projects)
  const addable = (available?.folders ?? []).flatMap((folder) => {
    if (folder.synced_here) return [];
    const parts = (folder.subfolders ?? [])
      .filter((sub) => !sub.synced_here)
      .map((sub) => ({ path: sub.path, files: sub.files, bytes: sub.bytes }));
    const whole = folder.partly_synced_here
      ? []
      : [{ path: folder.path, files: folder.files, bytes: folder.bytes }];
    return projectOnly || folder.partly_synced_here ? [...whole, ...parts] : whole;
  });

  const loadAvailable = useCallback(async () => {
    if (!edge) return;
    try {
      const res = await apiFetch("/api/sync/daemon/roots/available/");
      if (res.ok) setAvailable((await res.json()) as SyncAvailableRoots);
    } catch {
      // the hub may be offline; adding by path still works
    }
  }, [edge]);

  useEffect(() => {
    void loadAvailable();
  }, [loadAvailable, roots.length]);

  const addPath = async (path: string) => {
    setBusy(path);
    try {
      const { peers, note } = await changeRoot("POST", path, "Unable to add the folder.");
      warnFailedPeers(peers);
      toast.success(`Syncing ${path}.${note}`);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to add the folder.");
    } finally {
      setBusy(null);
    }
  };

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const path = newPath.trim();
    if (!path) return;
    setBusy("add");
    try {
      const { peers, note } = await changeRoot(
        "POST",
        path,
        "Unable to add the folder.",
      );
      warnFailedPeers(peers);
      toast.success(`Syncing ${path}.${note}`);
      setNewPath("");
      await onChanged();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to add the folder.",
      );
    } finally {
      setBusy(null);
    }
  };

  const remove = async (path: string, scope?: RemoveScope) => {
    setBusy(path);
    setConfirming(null);
    try {
      const { peers, note } = await changeRoot(
        "DELETE",
        path,
        "Unable to stop syncing the folder.",
        scope,
      );
      warnFailedPeers(peers);
      const where = scope === "this_computer" ? " on this computer" : "";
      toast.success(
        `Stopped syncing ${path}${where}. The files stay where they are.${note}`,
      );
      await onChanged();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Unable to stop syncing the folder.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="text-sm text-muted-foreground">Folders</div>
      <ul className="space-y-1">
        {roots.map((root) => {
          const path = root.path ?? root.id ?? "";
          const live = root.id ? statusById.get(root.id) : undefined;
          const pins = live?.pins?.length ? live.pins : (root.pins ?? []);
          const ignore = live?.ignore?.length
            ? live.ignore
            : (root.ignore ?? []);
          return (
            <li key={root.id ?? path} className="space-y-0.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-mono">
                  {path}
                  {root.only?.length ? (
                    <span className="text-muted-foreground"> · some projects</span>
                  ) : null}
                  {live ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · {live.entries.toLocaleString()} entries
                      {live.bytes ? ` · ${formatBytes(live.bytes)}` : ""}
                      {live.pending_fetches > 0
                        ? ` · ${live.pending_fetches} transferring`
                        : ""}
                      {live.scanning ? " · scanning" : ""}
                    </span>
                  ) : null}
                </span>
                {roots.length > 1 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    aria-label={`Stop syncing ${path}`}
                    disabled={busy !== null}
                    onClick={() =>
                      edge ? setConfirming(confirming === path ? null : path) : void remove(path)
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
              {edge && confirming === path ? (
                <div className="flex flex-wrap items-center gap-1.5 pl-2 text-[11px]">
                  <span className="text-muted-foreground">Stop syncing</span>
                  <Button
                    size="sm"
                    variant={projectOnly ? "default" : "outline"}
                    className="h-6 px-2 text-[11px]"
                    disabled={busy !== null}
                    onClick={() => void remove(path, "this_computer")}
                  >
                    on this computer
                  </Button>
                  <Button
                    size="sm"
                    variant={projectOnly ? "outline" : "default"}
                    className="h-6 px-2 text-[11px]"
                    disabled={busy !== null}
                    onClick={() => void remove(path, "everywhere")}
                  >
                    everywhere
                  </Button>
                </div>
              ) : null}
              {(root.only ?? []).map((rel) => {
                const part = `${path.replace(/\/$/, "")}/${rel}`;
                return (
                  <div key={part} className="flex items-center gap-2 pl-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px]">
                      {part}
                    </span>
                    {roots.length > 1 || (root.only ?? []).length > 1 ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        aria-label={`Stop syncing ${part}`}
                        disabled={busy !== null}
                        onClick={() => void remove(part, "this_computer")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    ) : null}
                  </div>
                );
              })}
              {live?.disk ? <DiskNote disk={live.disk} /> : null}
              {live?.peers?.map((peer) => (
                <div
                  key={peer.device}
                  className={`pl-2 text-[11px] ${peer.unsent || peer.unacked ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {peerBacklogLine(peer, peerName)}
                </div>
              ))}
              {pins.length ? (
                <div className="pl-2 text-[11px] text-muted-foreground">
                  Pinned (kept in full on one computer only):{" "}
                  <span className="font-mono">{pins.join(", ")}</span>
                </div>
              ) : null}
              {ignore.length ? (
                <div className="pl-2 text-[11px] text-muted-foreground">
                  {plural(ignore.length, "path")} kept on this computer only:{" "}
                  <span className="font-mono">{ignore.join(", ")}</span>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {edge && addable.length > 0 ? (
        <div className="space-y-1 pt-1">
          <div className="text-[11px] text-muted-foreground">
            Also on {available?.hub_name ?? "the hub"}, not synced here:
          </div>
          <ul className="max-h-48 space-y-1 overflow-auto">
            {addable.map((folder) => (
                <li key={folder.path} className="flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">
                    {folder.path}
                    {folder.files != null
                      ? ` · ${formatCount(folder.files)} files · ${formatBytes(folder.bytes)}`
                      : ""}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[11px]"
                    disabled={busy !== null}
                    onClick={() => void addPath(folder.path)}
                  >
                    {busy === folder.path ? "Adding…" : "Sync here"}
                  </Button>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
      <form className="flex gap-2" onSubmit={(event) => void add(event)}>
        <Input
          value={newPath}
          onChange={(event) => setNewPath(event.target.value)}
          placeholder="~/Documents/notes"
          aria-label="Folder to sync"
          className="h-8 font-mono text-xs"
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={busy !== null || !newPath.trim()}
        >
          {busy === "add" ? "Adding…" : "Add folder"}
        </Button>
      </form>
    </div>
  );
};
