import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import type { ThreadInfo } from "@/types/session";
import { ChevronRight, Terminal } from "lucide-react";
import type { ReactNode } from "react";

interface ThreadListItemProps {
  thread: ThreadInfo;
  showTopBorder?: boolean;
  onClick: () => void;
  action?: ReactNode;
}

const projectName = (path: string) => path.split("/").pop() || path;

const formatUpdatedAt = (updatedAt: string) =>
  new Date(updatedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const ThreadListItem = ({
  thread,
  showTopBorder = false,
  onClick,
  action,
}: ThreadListItemProps) => (
  <div
    onClick={onClick}
    className={cn(
      "group flex cursor-pointer items-center gap-2.5 px-3 py-1.5 transition-colors hover:bg-surface-muted",
      showTopBorder && "border-t border-border",
    )}
  >
    <Terminal className="h-3 w-3 shrink-0 text-muted-foreground" />
    <div className="flex min-w-0 flex-1 items-baseline gap-2">
      <span className="truncate text-[12.5px] font-medium text-foreground">
        {projectName(thread.directory)}
      </span>
      {thread.is_livekit_active_target ? (
        <span className="shrink-0 font-mono text-[10px] text-warning">
          voice
        </span>
      ) : thread.is_livekit_dispatcher || thread.is_livekit_shared ? (
        <span className="shrink-0 font-mono text-[10px] text-warning">
          dispatch
        </span>
      ) : null}
      <span className="truncate font-mono text-[11px] text-muted-foreground/70">
        {thread.directory}
      </span>
    </div>
    <StatusBadge status={thread.status} />
    <span className="hidden shrink-0 font-mono text-[10.5px] text-muted-foreground tabular-nums sm:inline">
      {formatUpdatedAt(thread.updated_at)}
    </span>
    {action}
    <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
  </div>
);
