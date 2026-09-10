import { useRef, useState } from "react";
import {
  Archive,
  Copy,
  FolderOpen,
  MoreHorizontal,
  Star,
  Terminal,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cliResumeCommands, type CliResumeCommand } from "@/lib/cli-resume";
import {
  isDispatcherThread,
  threadAgentVoiceName,
  threadModelLabel,
  threadProjectLabel,
} from "@/lib/thread-display";
import type { ThreadInfo } from "@/types/session";
import { ResumeThreadDialog } from "./ResumeThreadDialog";

interface ThreadActionsMenuProps {
  thread: ThreadInfo;
  isConnected: boolean;
  onToggleFavorite: () => Promise<void>;
  onArchive: () => Promise<void>;
  onOpenProject: () => void;
}

export function ThreadActionsMenu({
  thread,
  isConnected,
  onToggleFavorite,
  onArchive,
  onOpenProject,
}: ThreadActionsMenuProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [resumeCommand, setResumeCommand] = useState<CliResumeCommand | null>(
    null,
  );
  const isDispatcher = isDispatcherThread(thread);
  const commands = thread.directory
    ? cliResumeCommands({
        backend: thread.backend,
        backendSessionId: thread.backend_session_id,
        directory: thread.directory,
        threadId: thread.thread_id,
      })
    : [];
  const metadata = [
    threadAgentVoiceName(thread),
    threadModelLabel(thread),
    thread.reasoning_effort,
  ]
    .filter(Boolean)
    .join(" · ");
  const restoreFocus = (event: Event) => {
    event.preventDefault();
    trigger.current?.focus();
  };
  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(thread.thread_id);
      toast.success("Thread ID copied");
    } catch {
      toast.error("Failed to copy thread ID");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={trigger}
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            aria-label="Thread actions"
            title="Thread actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-72 max-w-[calc(100vw-2rem)]"
          onCloseAutoFocus={(event) => {
            if (archiveOpen || resumeCommand) event.preventDefault();
          }}
        >
          <DropdownMenuLabel className="space-y-1.5 font-normal">
            {metadata ? (
              <p className="break-words text-xs text-muted-foreground">
                {metadata}
              </p>
            ) : null}
            <p className="break-all font-mono text-[10px] text-muted-foreground">
              {thread.thread_id}
            </p>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              {isConnected ? (
                <Wifi className="h-3 w-3 text-success" />
              ) : (
                <WifiOff className="h-3 w-3 text-destructive" />
              )}
              {isConnected ? "Connected" : "Disconnected"}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {thread.directory ? (
            <DropdownMenuItem
              onSelect={onOpenProject}
              className="gap-2"
              title={thread.directory}
            >
              <FolderOpen className="h-4 w-4 shrink-0" />
              <span className="min-w-0">
                Open project
                <span className="block truncate text-xs text-muted-foreground">
                  {threadProjectLabel(thread)}
                </span>
              </span>
            </DropdownMenuItem>
          ) : null}
          {!isDispatcher ? (
            <DropdownMenuItem
              onSelect={() => void onToggleFavorite()}
              className="gap-2"
            >
              <Star
                className={`h-4 w-4 ${thread.is_favorite ? "fill-current text-warning" : ""}`}
              />
              {thread.is_favorite ? "Remove favorite" : "Favorite thread"}
            </DropdownMenuItem>
          ) : null}
          {commands.map((command) => (
            <DropdownMenuItem
              key={command.target}
              onSelect={() => setResumeCommand(command)}
              className="gap-2"
            >
              <Terminal className="h-4 w-4 shrink-0" />
              {command.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={() => void copyId()} className="gap-2">
            <Copy className="h-4 w-4" />
            Copy thread ID
          </DropdownMenuItem>
          {!isDispatcher ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setArchiveOpen(true)}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Archive className="h-4 w-4" />
                Archive thread
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent onCloseAutoFocus={restoreFocus}>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive thread?</AlertDialogTitle>
            <AlertDialogDescription>
              This hides the thread from active thread lists. If it is running,
              the current turn will be interrupted first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onArchive()}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={resumeCommand !== null}
        onOpenChange={(open) => {
          if (!open) setResumeCommand(null);
        }}
      >
        {resumeCommand ? (
          <ResumeThreadDialog
            command={resumeCommand}
            onCloseAutoFocus={restoreFocus}
          />
        ) : null}
      </Dialog>
    </>
  );
}
