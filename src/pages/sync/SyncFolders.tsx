import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { X } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

export type SyncFolderRoot = { id?: string; path?: string };

export type SyncFolderStatus = {
  id: string;
  entries: number;
  pending_fetches: number;
  scanning: boolean;
};

type PeerResult = { name: string; ok: boolean; error: string | null };

const changeRoot = async (
  method: "POST" | "DELETE",
  path: string,
  fallback: string,
): Promise<PeerResult[]> => {
  const res = await apiFetch("/api/sync/daemon/roots/", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, fallback));
  }
  const payload = (await res.json()) as { peers?: PeerResult[] };
  return payload.peers ?? [];
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
  status?: SyncFolderStatus[];
  onChanged: () => void | Promise<void>;
}> = ({ roots, status, onChanged }) => {
  const [newPath, setNewPath] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const statusById = new Map((status ?? []).map((root) => [root.id, root]));

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const path = newPath.trim();
    if (!path) return;
    setBusy("add");
    try {
      warnFailedPeers(
        await changeRoot("POST", path, "Unable to add the folder."),
      );
      toast.success(`Syncing ${path}.`);
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
      warnFailedPeers(
        await changeRoot("DELETE", path, "Unable to stop syncing the folder."),
      );
      toast.success(`Stopped syncing ${path}. The files stay where they are.`);
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
          return (
            <li
              key={root.id ?? path}
              className="flex items-center gap-2 text-xs"
            >
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
