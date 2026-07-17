import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderPlus, X } from "lucide-react";
import React, { useMemo, useState } from "react";
import {
  displayRelpath,
  parseHomeRelativePath,
  type SyncFolderSettings,
  type SyncFolderStatus,
  type SyncPeer,
} from "./syncApi";

const stateBadgeVariant = (
  state: string,
): "secondary" | "outline" | "destructive" => {
  const value = state.toLowerCase();
  if (value.includes("error") || value.includes("fail")) return "destructive";
  if (value === "idle" || value === "up-to-date") return "secondary";
  return "outline";
};

const formatPercent = (value: number) => `${Math.round(value)}%`;

const FolderRow: React.FC<{
  folder: SyncFolderSettings;
  status: SyncFolderStatus | undefined;
  peersByDeviceId: Map<string, SyncPeer>;
  busy: boolean;
  onRemove: () => void;
}> = ({ folder, status, peersByDeviceId, busy, onRemove }) => {
  const peerEntries = Object.entries(status?.peer_completion ?? {});
  return (
    <div className="flex flex-col gap-1.5 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-[12px] text-foreground">
            {displayRelpath(folder.relpath)}
          </span>
          <Badge
            variant={status ? stateBadgeVariant(status.state) : "outline"}
            className="h-5 px-1.5 text-[10px]"
          >
            {status
              ? `${status.state} · ${formatPercent(status.completion)}`
              : "waiting"}
          </Badge>
          {status?.receive_only ? (
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-[10px]"
              title="This folder is leased to another device right now; local changes are not sent until the lease returns."
            >
              Receive-only
            </Badge>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
          title="Stop syncing this folder"
          disabled={busy}
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      {peerEntries.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {peerEntries.map(([deviceId, completion]) => (
            <span
              key={deviceId}
              className="font-mono text-[11px] text-muted-foreground"
              title={deviceId}
            >
              {peersByDeviceId.get(deviceId)?.name ?? deviceId.slice(0, 7)}{" "}
              {formatPercent(completion)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const SyncFoldersCard: React.FC<{
  folders: SyncFolderSettings[];
  statusFolders: SyncFolderStatus[];
  peers: SyncPeer[];
  busy: boolean;
  onAddFolder: (relpath: string) => Promise<boolean>;
  onRemoveFolder: (folder: SyncFolderSettings) => void;
}> = ({ folders, statusFolders, peers, busy, onAddFolder, onRemoveFolder }) => {
  const [pathInput, setPathInput] = useState("");
  const [adding, setAdding] = useState(false);

  const statusById = useMemo(
    () => new Map(statusFolders.map((folder) => [folder.id, folder])),
    [statusFolders],
  );
  const peersByDeviceId = useMemo(
    () => new Map(peers.map((peer) => [peer.syncthing_device_id, peer])),
    [peers],
  );

  const parsed = parseHomeRelativePath(pathInput);
  const duplicate =
    parsed.relpath !== undefined &&
    folders.some((folder) => folder.relpath === parsed.relpath);
  const validationError =
    pathInput.trim().length === 0
      ? null
      : parsed.error ??
        (duplicate ? "This folder is already being synced." : null);
  const canAdd =
    !busy && !adding && parsed.relpath !== undefined && !duplicate;

  const submit = async () => {
    if (!canAdd || parsed.relpath === undefined) return;
    setAdding(true);
    const ok = await onAddFolder(parsed.relpath);
    if (ok) setPathInput("");
    setAdding(false);
  };

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="border-b border-border px-3 py-2.5">
        <p className="text-[12.5px] font-medium text-foreground">
          Synced directories
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Pick any folder under your home directory to keep identical on every
          synced computer.
        </p>
      </div>
      {folders.length === 0 ? (
        <div className="px-3 py-4 text-center text-[12px] text-muted-foreground">
          No folders are being synced yet.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {folders.map((folder) => (
            <FolderRow
              key={folder.id || folder.relpath}
              folder={folder}
              status={statusById.get(folder.id)}
              peersByDeviceId={peersByDeviceId}
              busy={busy}
              onRemove={() => onRemoveFolder(folder)}
            />
          ))}
        </div>
      )}
      <div className="border-t border-border px-3 py-2.5">
        <div className="flex gap-2">
          <Input
            value={pathInput}
            placeholder="~/Documents"
            className="h-8 font-mono text-[12px]"
            disabled={busy || adding}
            onChange={(event) => setPathInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submit();
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[12px]"
            disabled={!canAdd}
            onClick={() => void submit()}
          >
            <FolderPlus className="h-3 w-3" />
            {adding ? "Adding..." : "Add folder"}
          </Button>
        </div>
        {validationError ? (
          <p className="mt-1 text-[11px] text-destructive">{validationError}</p>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Enter a path under your home directory, like ~/Documents or
            ~/Projects/my-app.
          </p>
        )}
      </div>
    </div>
  );
};
