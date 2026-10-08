import { ArrowLeft, Star, WifiOff } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ModelBadge } from "@/components/ModelBadge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { TagPicker } from "@/components/tags/TagPicker";
import { DispatcherHelp } from "@/components/thread/DispatcherHelp";
import { DispatcherModelMenu } from "@/components/thread/DispatcherModelMenu";
import { ThreadActionsMenu } from "@/components/thread/ThreadActionsMenu";
import type { Continuation } from "@/components/thread/BackendSwitchMenu";
import type { PushResult } from "@/lib/thread-push";
import type { TagOption } from "@/lib/item-tags";
import { isDispatcherThread, threadDisplayName } from "@/lib/thread-display";
import type { ThreadInfo } from "@/types/session";

interface ThreadHeaderProps {
  thread: ThreadInfo;
  isConnected: boolean;
  tagOptions: TagOption[];
  onUpdateTags: (tags: string[]) => Promise<void>;
  onToggleFavorite: () => Promise<void>;
  onArchive: () => Promise<void>;
  onOpenProject: () => void;
  onContinued?: (thread: Continuation) => void;
  onPushed?: (result: PushResult) => void;
  onRename?: (name: string) => Promise<void>;
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
  const navigate = useNavigate();
  const title = threadDisplayName(thread);
  const model = thread.model ?? thread.current_turn?.model ?? null;
  const canRename = Boolean(actions.onRename) && !isDispatcherThread(thread);
  const [renameOpen, setRenameOpen] = useState(false);
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 py-2">
      {onBack ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onBack}
          aria-label="Back"
          title="Back"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <h1
          className={`min-w-0 truncate text-sm font-semibold text-foreground ${
            canRename ? "cursor-text" : ""
          }`}
          title={canRename ? `${title} — double-click to rename` : title}
          onDoubleClick={canRename ? () => setRenameOpen(true) : undefined}
        >
          {title}
        </h1>
        {isDispatcherThread(thread) ? <DispatcherHelp /> : null}
      </div>
      {thread.is_favorite ? (
        <Star
          className="h-3 w-3 shrink-0 fill-current text-warning"
          aria-label="Favorite"
        />
      ) : null}
      {isDispatcherThread(thread) ? (
        <DispatcherModelMenu />
      ) : model ? (
        <button
          type="button"
          onClick={() => navigate("/dashboard/settings?section=agents")}
          title="Model this thread runs on. Change the default in Settings → Agents."
          className="flex h-7 shrink-0 items-center rounded px-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <ModelBadge model={model} className="text-inherit" />
        </button>
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
        renameOpen={renameOpen}
        onRenameOpenChange={setRenameOpen}
        {...actions}
      />
    </header>
  );
}
