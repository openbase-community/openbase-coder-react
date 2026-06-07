import { StatusBadge } from "@/components/StatusBadge";
import {
  hasHistoricalVoice,
  shouldDeemphasizeThread,
  threadAgentVoiceName,
  threadDisplayName,
  threadProjectLabel,
} from "@/lib/thread-display";
import { cn } from "@/lib/utils";
import type { ThreadInfo } from "@/types/session";
import { ChevronRight, Star, Terminal } from "lucide-react";
import type { ReactNode } from "react";

interface ThreadListItemProps {
  thread: ThreadInfo;
  displayName?: string;
  showTopBorder?: boolean;
  onClick: () => void;
  onToggleFavorite?: (thread: ThreadInfo) => void;
  action?: ReactNode;
}

const formatUpdatedAt = (updatedAt: string) =>
  new Date(updatedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const ThreadListItem = ({
  thread,
  displayName,
  showTopBorder = false,
  onClick,
  onToggleFavorite,
  action,
}: ThreadListItemProps) => {
  const isDeemphasized = shouldDeemphasizeThread(thread);
  const agentVoiceName = threadAgentVoiceName(thread);

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex cursor-pointer items-center gap-2.5 px-3 py-1.5 transition-colors hover:bg-surface-muted",
        isDeemphasized && "opacity-60 saturate-0 hover:opacity-80",
        showTopBorder && "border-t border-border",
      )}
    >
      <Terminal className="h-3 w-3 shrink-0 text-muted-foreground" />
      {onToggleFavorite ? (
        <button
          type="button"
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface hover:text-foreground",
            thread.is_favorite && "text-warning hover:text-warning",
          )}
          title={thread.is_favorite ? "Remove favorite" : "Favorite thread"}
          aria-label={
            thread.is_favorite ? "Remove favorite" : "Favorite thread"
          }
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(thread);
          }}
        >
          <Star
            className={cn(
              "h-3 w-3",
              thread.is_favorite && "fill-current",
            )}
          />
        </button>
      ) : null}
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate text-[12.5px] font-medium text-foreground">
          {displayName ?? threadDisplayName(thread)}
        </span>
        {agentVoiceName && thread.voice_route?.role === "active_target" ? (
          <span className="shrink-0 font-mono text-[10px] text-warning">
            {agentVoiceName}
          </span>
        ) : agentVoiceName && thread.voice_route?.role === "dispatcher" ? (
          <span className="shrink-0 font-mono text-[10px] text-warning">
            {agentVoiceName}
          </span>
        ) : agentVoiceName && hasHistoricalVoice(thread) ? (
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            {agentVoiceName}
          </span>
        ) : null}
        <span className="truncate font-mono text-[11px] text-muted-foreground/70">
          {threadProjectLabel(thread)}
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
};
