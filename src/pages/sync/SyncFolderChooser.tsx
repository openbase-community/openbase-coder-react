import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import React, { useEffect, useState } from "react";
import { formatBytes, formatCount } from "./syncHealth";
import type {
  SyncDiskUsage,
  SyncHubFolder,
  SyncHubFoldersPreview,
  SyncHubSubfolder,
} from "./syncTypes";

/** What the user chose: the folders, and whether this computer is project-only. */
export type SyncFolderChoice = { roots: string[]; projectOnly: boolean };

const folderSize = (folder: SyncHubFolder | SyncHubSubfolder) =>
  folder.files == null
    ? "size unknown"
    : `${formatCount(folder.files)} files · ${formatBytes(folder.bytes)}`;

export const diskLine = (disk: SyncDiskUsage | null | undefined) =>
  disk?.free_bytes == null
    ? null
    : `${formatBytes(disk.free_bytes)} free of ${formatBytes(disk.total_bytes)}`;

/**
 * Before joining a hub: its folders with their size, preselected for a
 * laptop and left for the user to pick on a cloud workspace (project-only).
 */
export const SyncFolderChooser: React.FC<{
  hubId: string;
  hubName: string;
  busy: boolean;
  onJoin: (choice: SyncFolderChoice) => void | Promise<void>;
  onCancel: () => void;
}> = ({ hubId, hubName, busy, onJoin, onCancel }) => {
  const [preview, setPreview] = useState<SyncHubFoldersPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await apiFetch(
          `/api/sync/daemon/pairing/hub-folders/?hub=${encodeURIComponent(hubId)}`,
        );
        if (!res.ok) {
          throw new Error(
            await extractErrorMessage(res, `Unable to list ${hubName}'s folders.`),
          );
        }
        const data = (await res.json()) as SyncHubFoldersPreview;
        if (cancelled) return;
        setPreview(data);
        setSelected(
          new Set([
            ...data.folders.filter((f) => f.selected).map((f) => f.path),
            ...data.folders.flatMap((f) =>
              (f.subfolders ?? []).filter((sub) => sub.selected).map((sub) => sub.path),
            ),
          ]),
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : `Unable to list ${hubName}'s folders.`,
          );
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [hubId, hubName]);

  const toggle = (path: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(path);
      else next.delete(path);
      return next;
    });

  if (error) {
    return (
      <div className="space-y-2 rounded border p-3 text-xs">
        <p className="text-destructive">{error}</p>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Back
        </Button>
      </div>
    );
  }
  if (!preview) {
    return (
      <p className="rounded border p-3 text-xs text-muted-foreground">
        Asking {hubName} which folders it syncs…
      </p>
    );
  }

  // a whole folder covers its projects; otherwise its chosen projects count
  const chosenFolders = preview.folders.filter((f) => selected.has(f.path));
  const chosenParts = preview.folders
    .filter((f) => !selected.has(f.path))
    .flatMap((f) => (f.subfolders ?? []).filter((sub) => selected.has(sub.path)));
  const chosen = [...chosenFolders, ...chosenParts];
  const known = chosen.every((f) => f.bytes != null);
  const total = chosen.reduce((sum, f) => sum + (f.bytes ?? 0), 0);
  const free = preview.this_computer.disk?.free_bytes ?? null;
  const tight = known && free != null && total > free * 0.9;
  const local = diskLine(preview.this_computer.disk);

  return (
    <div className="space-y-2 rounded border p-3">
      <div className="text-sm font-medium">
        Which of {hubName}'s folders should this computer sync?
      </div>
      {preview.project_only ? (
        <p className="text-xs text-muted-foreground">
          This is a cloud workspace with a small disk: choose the projects it
          works on. Large files stay on {hubName} until something here uses
          them.
        </p>
      ) : null}
      <ul className="space-y-1.5">
        {preview.folders.map((folder) => {
          const whole = selected.has(folder.path);
          const subfolders = folder.subfolders ?? [];
          return (
            <li key={folder.path} className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`sync-folder-${folder.id}`}
                  checked={whole}
                  onCheckedChange={(value) => toggle(folder.path, value === true)}
                  aria-label={`Sync ${folder.path}`}
                />
                <label
                  htmlFor={`sync-folder-${folder.id}`}
                  className="min-w-0 flex-1 truncate font-mono"
                >
                  {folder.path}
                </label>
                <span className="shrink-0 text-muted-foreground">
                  {folderSize(folder)}
                </span>
              </div>
              {subfolders.length > 0 && !whole ? (
                <ul
                  className="max-h-48 space-y-1 overflow-auto pl-6"
                  aria-label={`Projects in ${folder.path}`}
                >
                  {subfolders.map((sub) => (
                    <li key={sub.path} className="flex items-center gap-2">
                      <Checkbox
                        id={`sync-folder-${folder.id}-${sub.name}`}
                        checked={selected.has(sub.path)}
                        onCheckedChange={(value) => toggle(sub.path, value === true)}
                        aria-label={`Sync ${sub.path}`}
                      />
                      <label
                        htmlFor={`sync-folder-${folder.id}-${sub.name}`}
                        className="min-w-0 flex-1 truncate font-mono"
                      >
                        {sub.name}
                      </label>
                      <span className="shrink-0 text-muted-foreground">
                        {folderSize(sub)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className={`text-xs ${tight ? "text-destructive" : "text-muted-foreground"}`}>
        {chosen.length === 0
          ? "No folder chosen."
          : known
            ? `About ${formatBytes(total)} to sync`
            : "Size of some folders unknown"}
        {local ? ` · this computer: ${local}` : ""}
        {tight ? ". That may not fit; choose fewer folders." : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy || chosen.length === 0}
          onClick={() =>
            void onJoin({
              roots: chosen.map((f) => f.path),
              projectOnly: preview.project_only,
            })
          }
        >
          {busy
            ? "Connecting…"
            : chosenFolders.length === preview.folders.length
              ? "Sync all folders"
              : `Sync ${chosen.length} ${chosen.length === 1 ? "folder" : "folders"}`}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
