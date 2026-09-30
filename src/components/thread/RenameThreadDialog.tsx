import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_THREAD_NAME_LENGTH, normalizeThreadName } from "@/lib/thread-name";

interface RenameThreadDialogProps {
  open: boolean;
  currentName: string;
  onOpenChange: (open: boolean) => void;
  onRename: (name: string) => Promise<void>;
  onCloseAutoFocus?: (event: Event) => void;
}

/** Dialog that renames a thread on its backend; the name is shared everywhere. */
export function RenameThreadDialog({
  open,
  currentName,
  onOpenChange,
  onRename,
  onCloseAutoFocus,
}: RenameThreadDialogProps) {
  const inputId = useId();
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName(currentName);
  }, [currentName, open]);

  const normalized = normalizeThreadName(name);
  const canSave =
    normalized.length > 0 && normalized !== currentName && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onRename(normalized);
      onOpenChange(false);
    } catch {
      // The caller reports the failure; keep the dialog open to retry.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent
        className="max-w-[min(28rem,calc(100vw-2rem))]"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle className="text-base">Rename thread</DialogTitle>
            <DialogDescription>
              The new name shows everywhere this thread appears, including in
              voice sessions and the native CLI.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={inputId} className="text-xs">
              Name
            </Label>
            <Input
              id={inputId}
              value={name}
              autoFocus
              maxLength={MAX_THREAD_NAME_LENGTH}
              onChange={(event) => setName(event.target.value)}
              onFocus={(event) => event.target.select()}
              className="h-9 text-sm"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!canSave}
              aria-busy={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
