import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { X } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { RESTART_NOTE } from "./restartNote";
import { formatCount, plural } from "./syncHealth";
import type { SyncOverviewRoot } from "./syncTypes";

export type SyncFolderRoot = {
  id?: string;
  path?: string;
  pins?: string[];
  ignore?: string[];
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

const changeRoot = async (
  method: "POST" | "DELETE",
  path: string,
  fallback: string,
): Promise<{ peers: PeerResult[]; note: string }> => {
  const res = await apiFetch("/api/sync/daemon/roots/", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
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

/** The synced folders, with add and remove. Changes apply on both computers. */
export const SyncFolders: React.FC<{
  roots: SyncFolderRoot[];
  status?: SyncOverviewRoot[];
  peerName?: (device: string) => string;
  onChanged: () => void | Promise<void>;
}> = ({ roots, status, peerName = (device) => device, onChanged }) => {
  const [newPath, setNewPath] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const statusById = new Map((status ?? []).map((root) => [root.id, root]));

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

  const remove = async (path: string) => {
    setBusy(path);
    try {
      const { peers, note } = await changeRoot(
        "DELETE",
        path,
        "Unable to stop syncing the folder.",
      );
      warnFailedPeers(peers);
      toast.success(
        `Stopped syncing ${path}. The files stay where they are.${note}`,
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
                  {live ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · {live.entries.toLocaleString()} entries
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
                    onClick={() => void remove(path)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
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
