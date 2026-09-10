import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useWorkspaceDraft, useWorkspaceTabTitle } from "@/contexts/workspace-tabs";
import { RunDetail } from "@/components/RunDetail";
import { ThreadHeader } from "@/components/ThreadHeader";
import { TurnBody, UserBubble } from "@/components/TurnBody";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import type {
  VoiceAgentState,
  VoiceCallStatus,
} from "@/hooks/use-voice-call";
import { useMarkEntityRead } from "@/contexts/notifications";
import { useThreadWebSocket } from "@/hooks/use-session-websocket";
import { useTagOptions } from "@/hooks/useTagOptions";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { setThreadTags } from "@/lib/item-tags";
import {
  isDispatcherThread,
  threadDisplayName,
  threadRoutePath,
} from "@/lib/thread-display";
import { setThreadFavorite } from "@/lib/thread-favorites";
import { promptAfterThreadTurnSubmission } from "@/lib/thread-turn-actions";
import {
  ArrowUp,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Square,
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
  const [searchParams] = useSearchParams();
  const {
    thread,
    isConnected,
    loadError,
    startTurn,
    queueTurn,
    steerTurn,
    interruptTurn,
    refreshThread,
  } = useThreadWebSocket(threadId);
  const { tagOptions, refreshTagOptions } = useTagOptions();
  const [prompt, setPrompt] = useWorkspaceDraft(`thread-prompt:${threadId}`);
  useWorkspaceTabTitle(thread ? threadDisplayName(thread) : undefined);
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
  const currentTurnOutput = thread?.current_turn?.accumulated_output;
  const currentTurnStderr = thread?.current_turn?.accumulated_stderr;

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

  const handleStartTurn = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isSubmittingPrompt) return;
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
  const openProject = () => {
    if (!thread?.directory) return;
    navigate(`/dashboard/project?path=${encodeURIComponent(thread.directory)}`);
  };
  const goBackToProject = () => {
    if (!fromProjectPath) return;
    navigate(`/dashboard/project?path=${encodeURIComponent(fromProjectPath)}`);
  };
  const isDispatchThread = Boolean(thread && isDispatcherThread(thread));

  const archiveThread = async () => {
    if (!thread) return;
    try {
      const res = await apiFetch(`/api/threads/${thread.thread_id}/`, {
        method: "DELETE",
      });
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
            onBack={fromProjectPath ? goBackToProject : undefined}
          />
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <div className="mx-auto w-full max-w-[860px] space-y-4">
            {thread && (connectionLost || loadError) ? (
              <div className="rounded border border-warning/40 bg-warning/10 px-3 py-2 text-[12px] text-warning">
                {loadError
                  ? loadError
                  : "Live connection lost — reconnecting… Updates may be delayed."}
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

        {thread ? (
          <div className="shrink-0 border-t border-border bg-background/95 p-2.5 backdrop-blur">
            <div className="mx-auto w-full max-w-[860px] space-y-1.5">
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
                  placeholder={
                    hasActiveCurrentTurn
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
                      !isConnected || !prompt.trim() || isSubmittingPrompt
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
