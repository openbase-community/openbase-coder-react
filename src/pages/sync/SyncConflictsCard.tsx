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
import { AlertTriangle, FolderX, GitBranch } from "lucide-react";
import React from "react";
import { shortSha, type SyncConflict, type SyncConflictType } from "./syncApi";

const formatDetectedAt = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? value : new Date(parsed).toLocaleString();
};

const conflictType = (conflict: SyncConflict): SyncConflictType =>
  conflict.type ??
  (conflict.kind === "branch" ? "repo-divergence" : "file-conflict");

const conflictLabel = (conflict: SyncConflict) =>
  conflict.repo_relpath ?? conflict.path ?? conflict.folder_id;

const conflictFiles = (conflict: SyncConflict) =>
  conflict.files ?? (conflict.path ? [conflict.path] : []);

const containingFolder = (conflict: SyncConflict) => {
  if (conflict.containing_folder !== undefined) {
    return conflict.containing_folder;
  }
  if (!conflict.path) return null;
  const index = conflict.path.lastIndexOf("/");
  if (index <= 0) return null;
  return conflict.path.slice(0, index);
};

const folderLabel = (conflict: SyncConflict) =>
  conflict.folder_relpath ? `~/${conflict.folder_relpath}` : conflict.folder_id;

export const SyncConflictsCard: React.FC<{
  conflicts: SyncConflict[];
  resolving: string | null;
  ignoring: string | null;
  onResolve: (id: string, action: "keep_local" | "use_remote") => void;
  onIgnoreContainingFolder: (id: string) => void;
}> = ({
  conflicts,
  resolving,
  ignoring,
  onResolve,
  onIgnoreContainingFolder,
}) => (
  <div className="overflow-hidden rounded border border-border bg-surface">
    <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-foreground">Conflicts</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Changes arrived from another device that could not be merged
          automatically.
        </p>
      </div>
      <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-[10px]">
        {conflicts.length}
      </Badge>
    </div>
    <div className="divide-y divide-border">
      {conflicts.map((conflict) => {
        const type = conflictType(conflict);
        const files = conflictFiles(conflict);
        const folder = containingFolder(conflict);
        const busy = Boolean(resolving || ignoring);
        return (
          <div key={conflict.id} className="px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Badge
                variant={type === "repo-divergence" ? "destructive" : "outline"}
                className="h-5 px-1.5 text-[10px]"
              >
                {type === "repo-divergence"
                  ? "Repo divergence"
                  : "File conflict"}
              </Badge>
              <span className="truncate font-mono text-[12px] text-foreground">
                {conflictLabel(conflict)}
              </span>
              {conflict.branch ? (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <GitBranch className="h-3 w-3" />
                  {conflict.branch}
                </span>
              ) : null}
              <span className="font-mono text-[11px] text-muted-foreground">
                {folderLabel(conflict)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {formatDetectedAt(conflict.detected_at)}
              </span>
            </div>
            {type === "repo-divergence" ? (
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
                <span>local {shortSha(conflict.local_sha)}</span>
                <span>remote {shortSha(conflict.remote_sha)}</span>
              </div>
            ) : null}
            {files.length > 0 ? (
              <div className="mt-1.5 space-y-0.5">
                {files.map((file) => (
                  <div
                    key={file}
                    className="truncate font-mono text-[11px] text-muted-foreground"
                  >
                    {file}
                  </div>
                ))}
              </div>
            ) : null}
            {type === "file-conflict" ? (
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
                {conflict.original_path ? (
                  <span>original {conflict.original_path}</span>
                ) : null}
                {conflict.conflict_device_hint ? (
                  <span>device {conflict.conflict_device_hint}</span>
                ) : null}
                {conflict.ignored_containing_folder ? (
                  <span>folder already ignored</span>
                ) : null}
                {conflict.conflict_copy_exists === false ? (
                  <span>conflict copy missing</span>
                ) : null}
                {conflict.original_exists === false ? (
                  <span>original missing</span>
                ) : null}
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              {folder ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-[12px]"
                      disabled={busy || conflict.ignored_containing_folder}
                    >
                      <FolderX className="h-3 w-3" />
                      {conflict.ignored_containing_folder
                        ? "Ignored"
                        : ignoring === conflict.id
                          ? "Ignoring..."
                          : "Ignore folder"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Ignore this folder?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {folder} will be added to this sync folder's ignore
                        list, and unresolved file conflicts inside it will be
                        cleared from this view.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={ignoring === conflict.id}
                        onClick={() => onIgnoreContainingFolder(conflict.id)}
                      >
                        Ignore folder
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[12px]"
                disabled={busy}
                onClick={() => onResolve(conflict.id, "keep_local")}
              >
                {resolving === `${conflict.id}:keep_local`
                  ? "Keeping..."
                  : "Keep local"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-[12px]"
                    disabled={busy}
                  >
                    Use remote
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Use the remote version?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {type === "repo-divergence" ? (
                        <>
                          {conflictLabel(conflict)} on branch{" "}
                          {conflict.branch ?? "unknown"} will be hard-reset to
                          the remote version
                          {conflict.remote_sha
                            ? ` (${shortSha(conflict.remote_sha)})`
                            : ""}
                          . Your local changes are saved to a stash backup
                          first, so they can be recovered with git if needed.
                        </>
                      ) : (
                        <>
                          The synced version will be kept and the
                          sync-conflict copy will be removed.
                        </>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={resolving === `${conflict.id}:use_remote`}
                      onClick={() => onResolve(conflict.id, "use_remote")}
                    >
                      Use remote
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
