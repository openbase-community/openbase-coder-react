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
import { AlertTriangle, GitBranch } from "lucide-react";
import React from "react";
import { shortSha, type SyncConflict } from "./syncApi";

const formatDetectedAt = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? value : new Date(parsed).toLocaleString();
};

export const SyncConflictsCard: React.FC<{
  conflicts: SyncConflict[];
  resolving: string | null;
  onResolve: (id: string, action: "keep_local" | "use_remote") => void;
}> = ({ conflicts, resolving, onResolve }) => (
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
      {conflicts.map((conflict) => (
        <div key={conflict.id} className="px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge
              variant={
                conflict.type === "repo-divergence" ? "destructive" : "outline"
              }
              className="h-5 px-1.5 text-[10px]"
            >
              {conflict.type === "repo-divergence"
                ? "Repo divergence"
                : "File conflict"}
            </Badge>
            <span className="truncate font-mono text-[12px] text-foreground">
              {conflict.repo_relpath}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
              <GitBranch className="h-3 w-3" />
              {conflict.branch}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatDetectedAt(conflict.detected_at)}
            </span>
          </div>
          {conflict.type === "repo-divergence" ? (
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
              <span>local {shortSha(conflict.local_sha)}</span>
              <span>remote {shortSha(conflict.remote_sha)}</span>
            </div>
          ) : null}
          {conflict.files && conflict.files.length > 0 ? (
            <div className="mt-1.5 space-y-0.5">
              {conflict.files.map((file) => (
                <div
                  key={file}
                  className="truncate font-mono text-[11px] text-muted-foreground"
                >
                  {file}
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              disabled={Boolean(resolving)}
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
                  disabled={Boolean(resolving)}
                >
                  Use remote
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Use the remote version?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {conflict.repo_relpath} on branch {conflict.branch} will be
                    hard-reset to the remote version
                    {conflict.remote_sha
                      ? ` (${shortSha(conflict.remote_sha)})`
                      : ""}
                    . Your local changes are saved to a stash backup first, so
                    they can be recovered with git if needed.
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
      ))}
    </div>
  </div>
);
