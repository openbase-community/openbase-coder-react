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
import type { ReportsFile } from "@/types/session";
import { Trash2 } from "lucide-react";

import { isEditingTarget } from "./reportDetailHelpers";

export const ReportDeleteButton = ({
  file,
  deleting,
  onDelete,
  open,
  onOpenChange,
}: {
  file: ReportsFile;
  deleting: boolean;
  onDelete: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const confirmDelete = () => {
    if (deleting) return;
    onOpenChange?.(false);
    onDelete();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          disabled={deleting}
          aria-label={`Delete ${file.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        onKeyDownCapture={(event) => {
          if (event.key !== "Enter" || isEditingTarget(event.target)) return;
          event.preventDefault();
          event.stopPropagation();
          confirmDelete();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Delete report?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete {file.name} from this project's reports folder.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Delete report
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
