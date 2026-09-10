import { ArrowLeft, Star, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { TagPicker } from "@/components/tags/TagPicker";
import { ThreadActionsMenu } from "@/components/thread/ThreadActionsMenu";
import type { TagOption } from "@/lib/item-tags";
import { threadDisplayName } from "@/lib/thread-display";
import type { ThreadInfo } from "@/types/session";

interface ThreadHeaderProps {
  thread: ThreadInfo;
  isConnected: boolean;
  tagOptions: TagOption[];
  onUpdateTags: (tags: string[]) => Promise<void>;
  onToggleFavorite: () => Promise<void>;
  onArchive: () => Promise<void>;
  onOpenProject: () => void;
  onBack?: () => void;
}

export function ThreadHeader({
  thread,
  isConnected,
  tagOptions,
  onUpdateTags,
  onBack,
  ...actions
}: ThreadHeaderProps) {
  const title = threadDisplayName(thread);
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 py-2">
      {onBack ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onBack}
          aria-label="Back to project"
          title="Back to project"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      <h1
        className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground"
        title={title}
      >
        {title}
      </h1>
      {thread.is_favorite ? (
        <Star
          className="h-3 w-3 shrink-0 fill-current text-warning"
          aria-label="Favorite"
        />
      ) : null}
      <span className="flex shrink-0 items-center">
        <StatusBadge
          status={thread.status}
          isLikelyStale={thread.is_likely_stale}
          statusWarning={thread.status_warning}
        />
      </span>
      {!isConnected ? (
        <span
          className="shrink-0 text-destructive"
          title="Disconnected"
          aria-label="Disconnected"
        >
          <WifiOff className="h-3.5 w-3.5" />
        </span>
      ) : null}
      <TagPicker
        tags={thread.tags ?? []}
        options={tagOptions}
        onChange={onUpdateTags}
        showBadges={false}
      />
      <ThreadActionsMenu
        thread={thread}
        isConnected={isConnected}
        {...actions}
      />
    </header>
  );
}
