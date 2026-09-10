import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CliResumeCommand } from "@/lib/cli-resume";

export function ResumeThreadDialog({
  command,
  onCloseAutoFocus,
}: {
  command: CliResumeCommand;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const [copied, setCopied] = useState(false);
  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(command.command);
      setCopied(true);
    } catch {
      toast.error("Failed to copy command");
    }
  };
  return (
    <DialogContent
      className="max-w-[min(32rem,calc(100vw-2rem))]"
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <DialogHeader>
        <DialogTitle className="text-base">{command.label}</DialogTitle>
        <DialogDescription>{command.description}</DialogDescription>
      </DialogHeader>
      <div className="flex min-w-0 items-start gap-2">
        <code className="min-w-0 flex-1 break-all rounded bg-muted px-3 py-2 font-mono text-xs">
          {command.command}
        </code>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={copyCommand}
          title={copied ? "Copied" : "Copy command"}
          aria-label={copied ? "Copied" : "Copy command"}
        >
          {copied ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Avoid steering this agent (voice or console) while the CLI session is
        open: two writers can fork the conversation.
      </p>
    </DialogContent>
  );
}
