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
import { formatCount, plural } from "./syncHealth";
import type { SyncHeldDeletesResponse } from "./syncTypes";

type Folder = SyncHeldDeletesResponse["roots"][number];
type Action = "release" | "discard";

/**
 * Deletions the mass-delete guard holds back from the other computers, with
 * the two ways out. Shown only while something is held.
 */
export const SyncHeldDeletes: React.FC<{
  data: SyncHeldDeletesResponse | null;
  onChanged: () => void | Promise<void>;
  displayPath?: (path: string) => string;
}> = ({ data, onChanged, displayPath = (path) => path }) => {
  const [confirm, setConfirm] = useState<{ folder: Folder; action: Action } | null>(
    null,
  );
  const [busy, setBusy] = useState<string | null>(null);

  const settle = async (folder: Folder, action: Action) => {
    setBusy(folder.id);
    try {
      const res = await apiFetch("/api/sync/daemon/held-deletes/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ root: folder.id, action }),
      });
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Unable to update the held deletions."));
      }
      const payload = (await res.json()) as { count: number };
      toast.success(
        action === "release"
          ? `Sent ${plural(payload.count, "deletion")} to your other computers.`
          : `Bringing back ${plural(payload.count, "file")} from your other computers.`,
      );
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update the held deletions.");
    } finally {
      setBusy(null);
    }
  };

  const folders = data?.roots ?? [];
  if (!folders.length) return null;

  return (
    <div className="space-y-2" id="sync-held-deletes">
      <h3 className="text-sm font-medium">Deletions waiting for you</h3>
      <p className="text-[11px] text-muted-foreground">
        Many files disappeared from this computer at once, so Openbase Sync
        stopped sending these deletions to your other computers. The files are
        still there. Release the deletions if you meant them, or bring the files
        back here.
      </p>
      <ul className="space-y-2">
        {folders.map((folder) => (
          <li key={folder.id} className="space-y-1 rounded border p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs">
                <span className="font-mono">{displayPath(folder.path)}</span>
                {` · ${formatCount(folder.count)} held`}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={busy !== null}
                  onClick={() => setConfirm({ folder, action: "discard" })}
                >
                  Bring files back
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={busy !== null}
                  onClick={() => setConfirm({ folder, action: "release" })}
                >
                  {busy === folder.id ? "Working…" : "Release deletions"}
                </Button>
              </div>
            </div>
            {folder.sample.length ? (
              <ul className="space-y-0.5 pl-2 font-mono text-[11px] text-muted-foreground">
                {folder.sample.slice(0, 5).map((path) => (
                  <li key={path} className="truncate">
                    {path}
                  </li>
                ))}
                {folder.count > 5 ? (
                  <li>… and {formatCount(folder.count - 5)} more</li>
                ) : null}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "release"
                ? `Release ${plural(confirm.folder.count, "deletion")}?`
                : `Bring back ${plural(confirm?.folder.count ?? 0, "file")}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "release"
                ? "Your other computers move these files to their Trash. Files that exist here again are left alone."
                : "The files are downloaded again from your other computers into this folder."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm) void settle(confirm.folder, confirm.action);
                setConfirm(null);
              }}
            >
              {confirm?.action === "release" ? "Release" : "Bring back"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
