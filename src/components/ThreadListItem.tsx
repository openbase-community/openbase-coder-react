import { StatusBadge } from "@/components/StatusBadge";
import { TagPicker } from "@/components/tags/TagPicker";
import { OpenInNewTabMenu } from "@/components/workspace/OpenInNewTabMenu";
import type { TagOption } from "@/lib/item-tags";
import {
  hasHistoricalVoice,
  isDispatcherThread,
  shouldDeemphasizeThread,
  threadAgentVoiceName,
  threadDisplayName,
  threadModelLabel,
  threadProjectLabel,
  threadRoutePath,
} from "@/lib/thread-display";
import { cn } from "@/lib/utils";
import type { ThreadInfo } from "@/types/session";
import { ModelBadge } from "@/components/ModelBadge";
import { ThreadGlyph } from "@/components/ThreadGlyph";
import { ChevronRight, Star } from "lucide-react";
import type { ReactNode } from "react";

interface ThreadListItemProps {
  thread: ThreadInfo;
  displayName?: string;
  showTopBorder?: boolean;
  onClick: () => void;
  onToggleFavorite?: (thread: ThreadInfo) => void;
  onTagsChange?: (thread: ThreadInfo, tags: string[]) => Promise<void> | void;
  tagOptions?: TagOption[];
  tagsDisabled?: boolean;
  action?: ReactNode;
  /** "time" when the surrounding list is already grouped by day. */
  timestamp?: "datetime" | "time";
}

const formatUpdatedAt = (updatedAt: string, mode: "datetime" | "time") =>
  new Date(updatedAt).toLocaleString(
    undefined,
    mode === "time"
      ? { hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  );

export const ThreadListItem = ({
  thread,
  displayName,
  showTopBorder = false,
  onClick,
  onToggleFavorite,
  onTagsChange,
  tagOptions = [],
  tagsDisabled = false,
  action,
  timestamp = "datetime",
}: ThreadListItemProps) => {
  const isDeemphasized = shouldDeemphasizeThread(thread);
  const isDispatcher = isDispatcherThread(thread);
  const agentVoiceName = threadAgentVoiceName(thread);
  const modelLabel = threadModelLabel(thread);
  const reasoningEffort =
    thread.reasoning_effort ?? thread.current_turn?.reasoning_effort ?? null;

  return (
    <OpenInNewTabMenu
      target={{
        path: threadRoutePath(thread),
        title: displayName ?? threadDisplayName(thread),
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }}
        className={cn(
          "group flex cursor-pointer items-center gap-2.5 py-1.5 transition-colors",
          isDeemphasized && "opacity-60 saturate-0 hover:opacity-80",
          showTopBorder && "border-t border-border",
        )}
      >
        <ThreadGlyph thread={thread} />
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
          {thread.moved_to?.state === "moved" ? (
            <span
              className="shrink-0 rounded-sm bg-surface-muted px-1 font-mono text-[10px] text-muted-foreground"
              title={`Moved to ${thread.moved_to.device ?? "another computer"}; this copy is read-only`}
            >
              → {thread.moved_to.device ?? "moved"}
            </span>
          ) : null}
          {thread.origin_device ? (
            <span
              className="shrink-0 rounded-sm bg-surface-muted px-1 font-mono text-[10px] text-muted-foreground"
              title={`Only on ${thread.origin_device}`}
            >
              {thread.origin_device}
            </span>
          ) : null}
        </div>
        {modelLabel ? (
          <ModelBadge
            model={thread.model ?? thread.current_turn?.model ?? modelLabel}
            suffix={reasoningEffort ?? undefined}
            title={`${thread.model ?? modelLabel}${reasoningEffort ? ` · ${reasoningEffort} reasoning` : ""}`}
            className="hidden shrink-0 md:inline-flex"
          />
        ) : null}
        <StatusBadge
          status={thread.status}
          isLikelyStale={thread.is_likely_stale}
          statusWarning={thread.status_warning}
        />
        {onTagsChange ? (
          <TagPicker
            tags={thread.tags ?? []}
            options={tagOptions}
            disabled={tagsDisabled}
            onChange={(tags) => onTagsChange(thread, tags)}
          />
        ) : null}
        <span className="hidden shrink-0 font-mono text-[10.5px] text-muted-foreground tabular-nums sm:inline">
          {formatUpdatedAt(thread.updated_at, timestamp)}
        </span>
        {onToggleFavorite ? (
          isDispatcher ? (
            // The Dispatcher cannot be favorited; reserve the slot so the
            // trailing controls line up with every other row.
            <span aria-hidden="true" className="h-6 w-6 shrink-0" />
          ) : (
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
                className={cn("h-3 w-3", thread.is_favorite && "fill-current")}
              />
            </button>
          )
        ) : null}
        {action}
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
      </div>
    </OpenInNewTabMenu>
  );
};
