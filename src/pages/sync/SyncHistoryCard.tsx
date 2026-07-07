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
import { Button } from "@/components/ui/button";
import { History, Trash2 } from "lucide-react";
import React from "react";
import { formatBytes } from "./syncApi";

export const SyncHistoryCard: React.FC<{
  usageBytes: number;
  purging: boolean;
  onPurge: () => void;
}> = ({ usageBytes, purging, onPurge }) => (
  <div className="overflow-hidden rounded border border-border bg-surface">
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="flex min-w-0 items-start gap-2">
        <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-foreground">
            Change history
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            30 days of remote-change history kept for undo. Currently using{" "}
            <span className="font-mono">{formatBytes(usageBytes)}</span>.
          </p>
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[12px]"
            disabled={purging}
          >
            <Trash2 className="h-3 w-3" />
            {purging ? "Purging..." : "Purge history"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purge sync history?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the stored history of changes received
              from other devices ({formatBytes(usageBytes)}). You will no
              longer be able to undo past remote changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={purging} onClick={onPurge}>
              Purge history
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </div>
);
