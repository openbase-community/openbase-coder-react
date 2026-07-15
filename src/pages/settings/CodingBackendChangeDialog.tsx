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
import { TriangleAlert } from "lucide-react";
import React from "react";

type Props = {
  open: boolean;
  currentLabel: string;
  selectedLabel: string;
  saving: boolean;
  canConfirm: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export const CodingBackendChangeDialog: React.FC<Props> = ({
  open,
  currentLabel,
  selectedLabel,
  saving,
  canConfirm,
  onOpenChange,
  onConfirm,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2 text-base">
          <TriangleAlert className="h-4 w-4 text-warning" />
          Change coding backend?
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-3 text-sm leading-5">
            <p>
              Switch from {currentLabel} to {selectedLabel}?
            </p>
            <p>
              Openbase will restart its managed services and create a new
              dispatcher thread. This interrupts any active voice call and may
              interrupt in-progress coding turns. The current dispatcher
              conversation context will be cleared.
            </p>
            <p>
              Existing Super Agent threads and project files are not deleted.
              Separately running Codex or Claude clients may need to be reopened
              so their MCP process reloads the backend.
            </p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
        <AlertDialogAction disabled={!canConfirm} onClick={onConfirm}>
          Change and restart
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
