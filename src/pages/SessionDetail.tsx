import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  useWorkspaceDraft,
  useWorkspaceTabTitle,
} from "@/contexts/workspace-tabs";
import { RunDetail } from "@/components/RunDetail";
import { ThreadHeader } from "@/components/ThreadHeader";
import { ContinuationLinks } from "@/components/thread/ContinuationLinks";
import { MovedThreadNotice } from "@/components/thread/MovedThreadNotice";
import { isThreadMovedAway } from "@/lib/thread-push";
import { ThreadTerminal } from "@/components/thread/ThreadTerminal";
import { TurnBody, UserBubble } from "@/components/TurnBody";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import type { VoiceAgentState, VoiceCallStatus } from "@/hooks/use-voice-call";
import { useMarkEntityRead } from "@/contexts/notifications";
import { useThreadWebSocket } from "@/hooks/use-session-websocket";
import { useThreadTerminalTab } from "@/hooks/useThreadTerminalTab";
import { useSidebarThreads } from "@/hooks/useSidebarThreads";
import { useTagOptions } from "@/hooks/useTagOptions";
import { apiFetch } from "@/lib/api";
import { fleetApiPath } from "@/lib/fleet";
import { extractErrorMessage } from "@/lib/api-errors";
import { setThreadTags } from "@/lib/item-tags";
import {
  isDispatcherThread,
  threadDisplayName,
  threadRoutePath,
} from "@/lib/thread-display";
import { setThreadFavorite } from "@/lib/thread-favorites";
import { renameThread } from "@/lib/thread-name";
import { threadSupportsTerminal } from "@/lib/thread-terminal";
import { promptAfterThreadTurnSubmission } from "@/lib/thread-turn-actions";
import {
  ArrowUp,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Radio,
  Square,
  SquareTerminal,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

/**
 * Voice-call controls handed to the dispatch composer so an empty message
 * field offers a "start call" button instead of a disabled send button. Shaped
 * to match the return value of {@link useVoiceCall}.
 */
export interface VoiceCallControls {
  status: VoiceCallStatus;
  muted: boolean;
  agentState: VoiceAgentState;
  error: string | null;
  audioContainerRef: React.RefObject<HTMLDivElement | null>;
  start: () => Promise<void>;
  end: () => void;
  toggleMute: () => Promise<void>;
}

interface SessionDetailProps {
  threadIdOverride?: string;
  allowDispatcherThread?: boolean;
  call?: VoiceCallControls;
}

function agentStateLabel(state: VoiceAgentState): string {
  switch (state) {
    case "initializing":
      return "Dispatcher is joining…";
    case "listening":
      return "Dispatcher is listening";
    case "thinking":
      return "Dispatcher is thinking…";
    case "speaking":
      return "Dispatcher is speaking";
    default:
      return "In call with the Dispatcher";
  }
}

const scrollToBottomInstantly = (target: HTMLElement | null) => {
  const scrollRoot = findScrollContainer(target);
  if (!scrollRoot) return;
  scrollRoot.scrollTop = scrollRoot.scrollHeight;
};

const findScrollContainer = (target: HTMLElement | null) => {
  if (!target) return null;

  let parent = target.parentElement;
  while (parent) {
    const overflowY = window.getComputedStyle(parent).overflowY;
    if (
      ["auto", "scroll", "overlay"].includes(overflowY) &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }

  return document.scrollingElement instanceof HTMLElement
    ? document.scrollingElement
    : document.documentElement;
};

const SessionDetail = ({
  threadIdOverride,
  allowDispatcherThread = false,
  call,
}: SessionDetailProps = {}) => {
  const { threadId: routeThreadId } = useParams<{ threadId: string }>();
  const threadId = threadIdOverride ?? routeThreadId;
  useMarkEntityRead("thread", threadId);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    thread,
    isConnected,
    loadError,
    startTurn,
    queueTurn,
    steerTurn,
    interruptTurn,
    refreshThread,
    loadOlderTurns,
    isLoadingOlderTurns,
  } = useThreadWebSocket(threadId);
  const { tagOptions, refreshTagOptions } = useTagOptions();
  const [prompt, setPrompt] = useWorkspaceDraft(`thread-prompt:${threadId}`);
  useWorkspaceTabTitle(thread ? threadDisplayName(thread) : undefined);
  // Showing a thread opens it in the threads sidebar (like a terminal tab)
  // and expands its project; a later rename only refreshes an entry that is
  // still open, so closing it from the sidebar sticks.
  const sidebarThreads = useSidebarThreads();
  const shownThreadId = thread?.thread_id;
  const shownDirectory = thread?.directory;
  const shownName = thread ? threadDisplayName(thread) : undefined;
  const shownOriginHost = thread?.origin_host ?? null;
  const shownIsDispatcher = Boolean(thread && isDispatcherThread(thread));
  useEffect(() => {
    if (!shownThreadId || !shownDirectory || !shownName || shownIsDispatcher)
      return;
    sidebarThreads.openThread({
      thread_id: shownThreadId,
      directory: shownDirectory,
      name: shownName,
      origin_host: shownOriginHost,
    });
    // Register once per thread; the next effect keeps the name current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownThreadId, shownIsDispatcher]);
  useEffect(() => {
    if (!shownThreadId || !shownDirectory || !shownName || shownIsDispatcher)
      return;
    sidebarThreads.updateThread(shownThreadId, {
      directory: shownDirectory,
      name: shownName,
      origin_host: shownOriginHost,
    });
  }, [
    sidebarThreads,
    shownThreadId,
    shownDirectory,
    shownName,
    shownOriginHost,
    shownIsDispatcher,
  ]);
  const [isSubmittingPrompt, setIsSubmittingPrompt] = useState(false);
  const [activePromptMode, setActivePromptMode] = useState<"steer" | "queue">(
    "steer",
  );
  const hasConnectedRef = useRef(false);
  if (isConnected) {
    hasConnectedRef.current = true;
  }
  const connectionLost = hasConnectedRef.current && !isConnected;
  const outputRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const loadingOlderRef = useRef(false);
  const currentTurnOutput = thread?.current_turn?.accumulated_output;
  const currentTurnStderr = thread?.current_turn?.accumulated_stderr;
  const [terminalTabEnabled] = useThreadTerminalTab();
  const showTerminalTab = Boolean(
    terminalTabEnabled && thread && threadSupportsTerminal(thread),
  );
  const terminalActive =
    showTerminalTab && searchParams.get("view") === "terminal";
  // Mounted on first open, then kept (hidden) so flipping back to Chat and
  // returning does not reattach the TUI.
  const [terminalMounted, setTerminalMounted] = useState(false);
  useEffect(() => {
    if (terminalActive) setTerminalMounted(true);
  }, [terminalActive]);
  useEffect(() => {
    setTerminalMounted(false);
  }, [threadId]);
  const setThreadView = (view: "chat" | "terminal") => {
    setSearchParams(
      (params) => {
        const updated = new URLSearchParams(params);
        if (view === "terminal") {
          updated.set("view", "terminal");
        } else {
          updated.delete("view");
        }
        return updated;
      },
      { replace: true },
    );
  };

  useLayoutEffect(() => {
    const scrollRoot = findScrollContainer(threadEndRef.current);
    if (!scrollRoot) return;

    const previousScrollBehavior = scrollRoot.style.scrollBehavior;
    scrollRoot.style.scrollBehavior = "auto";

    return () => {
      scrollRoot.style.scrollBehavior = previousScrollBehavior;
    };
  }, [thread?.thread_id]);

  useLayoutEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [currentTurnOutput]);

  useEffect(() => {
    if (!thread || allowDispatcherThread) return;
    const routePath = threadRoutePath(thread);
    if (routePath === "/dashboard/dispatch") {
      navigate(routePath, { replace: true });
    }
  }, [allowDispatcherThread, navigate, thread]);

  useLayoutEffect(() => {
    if (loadingOlderRef.current) return;
    scrollToBottomInstantly(threadEndRef.current);
  }, [
    thread?.thread_id,
    thread?.turn_history.length,
    thread?.current_turn?.turn_id,
    thread?.current_turn?.steers?.length,
    thread?.queued_turns?.length,
    currentTurnOutput,
    currentTurnStderr,
    thread?.status,
  ]);

  const handleLoadOlderTurns = async () => {
    const scrollRoot = findScrollContainer(threadEndRef.current);
    if (!scrollRoot) return;
    const previousHeight = scrollRoot.scrollHeight;
    const previousTop = scrollRoot.scrollTop;
    loadingOlderRef.current = true;
    const loaded = await loadOlderTurns();
    requestAnimationFrame(() => {
      if (loaded) {
        scrollRoot.scrollTop =
          previousTop + (scrollRoot.scrollHeight - previousHeight);
      }
      loadingOlderRef.current = false;
    });
  };

  // A thread pushed to a durable machine continues there; this copy is
  // read-only (the server refuses turns too).
  const movedAway = isThreadMovedAway(thread);
  const handleStartTurn = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isSubmittingPrompt || movedAway) return;
    setIsSubmittingPrompt(true);
    try {
      const accepted = await (hasActiveCurrentTurn
        ? activePromptMode === "steer"
          ? steerTurn(trimmed)
          : queueTurn(trimmed)
        : startTurn(trimmed));
      if (accepted) {
        setPrompt((current) =>
          promptAfterThreadTurnSubmission(current, trimmed, accepted),
        );
      }
    } finally {
      setIsSubmittingPrompt(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleStartTurn();
    }
  };

  const hasActiveCurrentTurn =
    thread?.current_turn?.status === "running" ||
    thread?.current_turn?.status === "waiting";
  const inCall = call?.status === "connected";
  const callConnecting = call?.status === "connecting";
  // An empty composer offers the voice call; typing turns it back into send.
  const showCallButton =
    Boolean(call) &&
    !inCall &&
    !hasActiveCurrentTurn &&
    prompt.trim().length === 0;
  const fromProjectPath = searchParams.get("fromProject");
  const fromThreads = searchParams.get("from") === "threads";
  const openProject = () => {
    if (!thread?.directory) return;
    navigate(`/dashboard/project?path=${encodeURIComponent(thread.directory)}`);
  };
  const goBackToProject = () => {
    if (!fromProjectPath) return;
    navigate(`/dashboard/project?path=${encodeURIComponent(fromProjectPath)}`);
  };
  const goBack = fromProjectPath
    ? goBackToProject
    : fromThreads
      ? () => navigate("/dashboard/threads")
      : undefined;
  const isDispatchThread = Boolean(thread && isDispatcherThread(thread));
  // A Dispatcher chat with nothing said yet shows a large, faint Dispatcher
  // glyph in the otherwise empty transcript area.
  const showDispatchEmptyState =
    isDispatchThread &&
    thread?.turn_history.length === 0 &&
    !thread.current_turn &&
    !thread.history_next_cursor;

  const archiveThread = async () => {
    if (!thread) return;
    try {
      const res = await apiFetch(
        fleetApiPath(thread.origin_host, `/api/threads/${thread.thread_id}/`),
        { method: "DELETE" },
      );
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Failed to archive thread"),
        );
      }
      toast.success("Thread archived");
      navigate("/dashboard/threads");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to archive thread",
      );
    }
  };

  const toggleFavorite = async () => {
    if (!thread || isDispatchThread) return;
    try {
      await setThreadFavorite(thread.thread_id, !thread.is_favorite);
      await refreshThread();
    } catch {
      toast.error("Failed to update favorite");
    }
  };

  const rename = async (name: string) => {
    if (!thread) return;
    try {
      await renameThread(thread.thread_id, name, thread.origin_host);
      await refreshThread();
      toast.success("Thread renamed");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to rename thread",
      );
      throw err;
    }
  };

  const updateTags = async (tags: string[]) => {
    if (!thread) return;
    try {
      await setThreadTags(thread.thread_id, tags);
      void refreshTagOptions();
      await refreshThread();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update tags");
    }
  };

  return (
    <DashboardLayout noPadding>
      <div className="flex h-full min-h-0 flex-col">
        {thread ? (
          <ThreadHeader
            key={thread.thread_id}
            thread={thread}
            isConnected={isConnected}
            tagOptions={tagOptions}
            onUpdateTags={updateTags}
            onToggleFavorite={toggleFavorite}
            onArchive={archiveThread}
            onOpenProject={openProject}
            onRename={rename}
            onBack={goBack}
            onPushed={() => {
              // The old copy now answers fleet reads with the moved one, so
              // a refresh follows the thread to its durable machine.
              void refreshThread();
            }}
            onContinued={(next) => {
              setPrompt(prompt, `thread-prompt:${next.thread_id}`);
              setPrompt("");
              navigate(`/dashboard/threads/${next.thread_id}`);
            }}
          />
        ) : null}

        {showTerminalTab ? (
          <div
            role="tablist"
            aria-label="Thread view"
            className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-1 text-[11.5px]"
          >
            {(
              [
                { view: "chat", label: "Chat", Icon: MessageSquare },
                { view: "terminal", label: "Terminal", Icon: SquareTerminal },
              ] as const
            ).map(({ view, label, Icon }) => {
              const selected = (view === "terminal") === terminalActive;
              return (
                <button
                  key={view}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setThreadView(view)}
                  className={`flex h-6 items-center gap-1.5 rounded-md px-2 transition-colors ${
                    selected
                      ? "bg-surface-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}

        {thread && terminalMounted && showTerminalTab ? (
          <div className={terminalActive ? "min-h-0 flex-1" : "hidden"}>
            <ThreadTerminal
              threadId={thread.thread_id}
              originHost={thread.origin_host}
              active={terminalActive}
            />
          </div>
        ) : null}

        <div
          className={`relative min-h-0 flex-1 overflow-y-auto px-3 py-4 ${
            terminalActive ? "hidden" : ""
          }`}
        >
          {showDispatchEmptyState ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <Radio
                strokeWidth={1.25}
                className="h-40 w-40 text-foreground opacity-[0.06] dark:opacity-[0.08]"
              />
            </div>
          ) : null}
          <div className="mx-auto w-full max-w-[720px] space-y-8">
            {thread ? (
              <ContinuationLinks key={thread.thread_id} thread={thread} />
            ) : null}
            {thread?.moved_to ? (
              <MovedThreadNotice thread={thread} onChanged={refreshThread} />
            ) : null}
            {thread && (connectionLost || loadError) ? (
              <div className="rounded border border-warning/40 bg-warning/10 px-3 py-2 text-[12px] text-warning">
                {loadError
                  ? loadError
                  : "Live connection lost — reconnecting… Updates may be delayed."}
              </div>
            ) : null}

            {thread?.history_next_cursor ? (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoadingOlderTurns}
                  onClick={() => void handleLoadOlderTurns()}
                  className="h-7 px-3 text-[11px]"
                >
                  {isLoadingOlderTurns ? "Loading…" : "Load older turns"}
                </Button>
              </div>
            ) : null}

            {thread?.turn_history.map((turn) => (
              <RunDetail
                key={turn.turn_id}
                run={turn}
                directory={thread.directory}
              />
            ))}

            {thread?.current_turn ? (
              <div className="space-y-2">
                {hasActiveCurrentTurn ? (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={interruptTurn}
                      aria-label="Interrupt current turn"
                      className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Square className="h-2.5 w-2.5" />
                      Interrupt
                    </Button>
                  </div>
                ) : null}
                <TurnBody
                  turn={thread.current_turn}
                  outputRef={outputRef}
                  directory={thread.directory}
                />
              </div>
            ) : null}

            {thread?.queued_turns?.length
              ? thread.queued_turns.map((queued, index) => (
                  <UserBubble
                    key={queued.queue_id ?? index}
                    text={queued.prompt}
                    hint="Queued"
                  />
                ))
              : null}

            <div ref={threadEndRef} aria-hidden="true" />

            {!thread ? (
              loadError ? (
                <ErrorBanner className="mx-auto mt-12 max-w-md text-center">
                  {loadError}
                </ErrorBanner>
              ) : (
                <div className="py-12 text-center text-[12px] text-muted-foreground">
                  {isConnected ? "Loading…" : "Connecting…"}
                </div>
              )
            ) : null}
          </div>
        </div>

        {thread && !terminalActive ? (
          <div className="shrink-0 border-t border-border bg-background/95 p-2.5 backdrop-blur">
            <div className="mx-auto w-full max-w-[720px] space-y-1.5">
              {call && (inCall || callConnecting) ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-1.5 text-[12px]">
                  <span className="truncate text-muted-foreground">
                    {callConnecting
                      ? "Connecting to the Dispatcher…"
                      : agentStateLabel(call.agentState)}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant={call.muted ? "destructive" : "outline"}
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => void call.toggleMute()}
                      aria-label={call.muted ? "Unmute" : "Mute"}
                    >
                      {call.muted ? (
                        <MicOff className="h-3 w-3" />
                      ) : (
                        <Mic className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={call.end}
                      aria-label="End call"
                    >
                      <PhoneOff className="h-3 w-3" />
                      End
                    </Button>
                  </div>
                </div>
              ) : null}

              {call?.error ? (
                <p className="px-1 text-[11px] text-destructive">
                  {call.error}
                </p>
              ) : null}

              {hasActiveCurrentTurn ? (
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setActivePromptMode("steer")}
                    className={`rounded-full px-2.5 py-0.5 transition-colors ${
                      activePromptMode === "steer"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-surface-muted"
                    }`}
                  >
                    Steer
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePromptMode("queue")}
                    className={`rounded-full px-2.5 py-0.5 transition-colors ${
                      activePromptMode === "queue"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-surface-muted"
                    }`}
                  >
                    Queue
                  </button>
                </div>
              ) : null}

              <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-1.5 transition-colors focus-within:border-ring">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label="Turn prompt"
                  disabled={movedAway}
                  placeholder={
                    movedAway
                      ? `Moved to ${thread?.moved_to?.device ?? "another computer"}. Continue it there.`
                      : hasActiveCurrentTurn
                      ? activePromptMode === "steer"
                        ? "Steer the active turn…"
                        : "Queue a follow-up turn…"
                      : showCallButton
                        ? "Message the Dispatcher, or start a call…"
                        : "Start a turn…"
                  }
                  className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[12.5px] text-foreground focus:outline-none"
                  rows={1}
                />
                {showCallButton ? (
                  <Button
                    onClick={() => void call?.start()}
                    disabled={callConnecting}
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-full"
                    aria-label="Start voice call"
                    title="Start voice call with the Dispatcher"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => void handleStartTurn()}
                    disabled={
                      !isConnected ||
                      !prompt.trim() ||
                      isSubmittingPrompt ||
                      movedAway
                    }
                    aria-busy={isSubmittingPrompt}
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-full"
                    aria-label={
                      hasActiveCurrentTurn
                        ? activePromptMode === "steer"
                          ? "Steer active turn"
                          : "Queue follow-up turn"
                        : "Start turn"
                    }
                    title={
                      isConnected
                        ? hasActiveCurrentTurn
                          ? activePromptMode === "steer"
                            ? "Steer active turn"
                            : "Queue follow-up turn"
                          : "Start turn"
                        : "Thread disconnected"
                    }
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {call ? (
              <div ref={call.audioContainerRef} className="hidden" />
            ) : null}
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default SessionDetail;
