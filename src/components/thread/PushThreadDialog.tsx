import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PushFailure,
  pushThread,
  type DurableTarget,
  type PushResult,
} from "@/lib/thread-push";
import type { ThreadInfo } from "@/types/session";

interface PushThreadDialogProps {
  thread: ThreadInfo;
  target: DurableTarget | null;
  onOpenChange: (open: boolean) => void;
  onPushed: (result: PushResult) => void;
  onCloseAutoFocus?: (event: Event) => void;
}

/** Confirms a push, with an optional message to continue with over there. */
export function PushThreadDialog({
  thread,
  target,
  onOpenChange,
  onPushed,
  onCloseAutoFocus,
}: PushThreadDialogProps) {
  const messageId = useId();
  const [message, setMessage] = useState("");
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (target) {
      setMessage("");
      setError(null);
    }
  }, [target]);
  if (!target) return null;

  const submit = async () => {
    if (pushing) return;
    setPushing(true);
    setError(null);
    try {
      const result = await pushThread(thread, target.key, message);
      toast.success(`Moved to ${result.moved_to?.device ?? target.name}`);
      if (result.turn_error) {
        toast.error(`Your message was not sent there: ${result.turn_error}`);
      }
      onOpenChange(false);
      onPushed(result);
    } catch (caught) {
      const text =
        caught instanceof Error ? caught.message : "Unable to push the thread";
      setError(
        caught instanceof PushFailure && caught.safeToRetry
          ? `${text} You can try again.`
          : text,
      );
    } finally {
      setPushing(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !pushing && onOpenChange(open)}>
      <DialogContent
        className="max-w-[min(30rem,calc(100vw-2rem))]"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>Push to {target.name}?</DialogTitle>
          <DialogDescription>
            The thread pauses here and continues on {target.name}, which keeps
            running while this computer sleeps. The copy here becomes read-only.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={messageId}>Continue with (optional)</Label>
          <Textarea
            id={messageId}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={`A message to send once it is on ${target.name}`}
            rows={3}
            disabled={pushing}
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pushing}
          >
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={pushing}>
            {pushing ? "Pushing…" : `Push to ${target.name}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
