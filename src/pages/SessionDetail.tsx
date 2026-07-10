import DashboardLayout from "@/components/layouts/DashboardLayout";
import { RunDetail } from "@/components/RunDetail";
import { StatusBadge } from "@/components/StatusBadge";
import { TurnBody, UserInputBlock } from "@/components/TurnBody";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useThreadWebSocket } from "@/hooks/use-session-websocket";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { setThreadFavorite } from "@/lib/thread-favorites";
import {
  threadAgentVoiceName,
  threadDisplayName,
  threadProjectLabel,
  threadRoutePath,
} from "@/lib/thread-display";
import {
  Archive,
  ArrowLeft,
  FolderOpen,
  Send,
  Square,
  Star,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

interface SessionDetailProps {
  threadIdOverride?: string;
  allowDispatcherThread?: boolean;
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
}: SessionDetailProps = {}) => {
  const { threadId: routeThreadId } = useParams<{ threadId: string }>();
  const threadId = threadIdOverride ?? routeThreadId;
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
  const [prompt, setPrompt] = useState("");
  const [activePromptMode, setActivePromptMode] = useState<"steer" | "queue">(
    "steer",
  );
  const hasConnectedRef = useRef(false);
  if (isConnected) {
    hasConnectedRef.current = true;
  }
  const connectionLost = hasConnectedRef.current && !isConnected;
  const outputRef = useRef<HTMLPreElement>(null);
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

  const handleStartTurn = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    const sent = hasActiveCurrentTurn
      ? activePromptMode === "steer"
        ? steerTurn(trimmed)
        : queueTurn(trimmed)
      : startTurn(trimmed);
    if (sent) {
      setPrompt("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleStartTurn();
    }
  };

  const hasActiveCurrentTurn =
    thread?.current_turn?.status === "running" ||
    thread?.current_turn?.status === "waiting";
  const fromProjectPath = searchParams.get("fromProject");
  const openProject = () => {
    if (!thread?.directory) return;
    navigate(`/dashboard/project?path=${encodeURIComponent(thread.directory)}`);
  };
  const goBackToProject = () => {
    if (!fromProjectPath) return;
    navigate(`/dashboard/project?path=${encodeURIComponent(fromProjectPath)}`);
  };
  const isDispatchThread = thread?.voice_route?.role === "dispatcher";
  const agentVoiceName = thread ? threadAgentVoiceName(thread) : undefined;

  const archiveThread = async () => {
    if (!thread) return;
    try {
      const res = await apiFetch(`/api/threads/${thread.thread_id}/`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Failed to archive thread"));
      }
      toast.success("Thread archived");
      navigate("/dashboard/threads");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive thread");
    }
  };

  const toggleFavorite = async () => {
    if (!thread) return;
    try {
      await setThreadFavorite(thread.thread_id, !thread.is_favorite);
      await refreshThread();
    } catch {
      toast.error("Failed to update favorite");
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-3 pb-24">
        {thread ? (
          <div className="sticky top-9 z-[5] -mx-5 border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {fromProjectPath ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goBackToProject}
                    className="h-6 px-2 text-[11px]"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back
                  </Button>
                ) : null}
                <h1 className="text-sm font-semibold text-foreground">
                  {threadDisplayName(thread)}
                </h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFavorite}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  title={
                    thread.is_favorite ? "Remove favorite" : "Favorite thread"
                  }
                  aria-label={
                    thread.is_favorite ? "Remove favorite" : "Favorite thread"
                  }
                >
                  <Star
                    className={`h-3 w-3 ${
                      thread.is_favorite ? "fill-current text-warning" : ""
                    }`}
                  />
                </Button>
                <StatusBadge
                  status={thread.status}
                  isLikelyStale={thread.is_likely_stale}
                  statusWarning={thread.status_warning}
                />
                {agentVoiceName ? (
                  <span className="font-mono text-[10px] text-warning">
                    {agentVoiceName}
                  </span>
                ) : null}
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {threadProjectLabel(thread)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openProject}
                  className="h-6 px-2 text-[11px]"
                >
                  <FolderOpen className="h-3 w-3" />
                  Project
                </Button>
                {!isDispatchThread ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <Archive className="h-3 w-3" />
                        Archive
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Archive thread?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This hides the thread from active thread lists. If it is
                          running, the current turn will be interrupted first.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={archiveThread}>
                          Archive
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
                <span className="ml-auto flex items-center gap-1 font-mono text-[10.5px]">
                  {isConnected ? (
                    <>
                      <Wifi className="h-3 w-3 text-success" />
                      <span className="text-success">connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 text-destructive" />
                      <span className="text-destructive">disconnected</span>
                    </>
                  )}
                </span>
              </div>
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {thread.directory}
              </p>
              <p className="truncate font-mono text-[10.5px] text-muted-foreground/60">
                {thread.thread_id}
              </p>
            </div>
          </div>
        ) : null}

        {thread && (connectionLost || loadError) ? (
          <div className="rounded border border-warning/40 bg-warning/10 px-3 py-2 text-[12px] text-warning">
            {loadError
              ? loadError
              : "Live connection lost — reconnecting… Updates may be delayed."}
          </div>
        ) : null}

        {thread && thread.turn_history.length > 0 ? (
          <section className="overflow-hidden rounded border border-border bg-surface">
            <div className="border-b border-border bg-surface-muted px-3 py-1.5">
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                turn history
              </p>
            </div>
            <div className="space-y-px p-2">
              {thread.turn_history.map((turn) => (
                <RunDetail key={turn.turn_id} run={turn} />
              ))}
            </div>
          </section>
        ) : null}

        {thread?.current_turn ? (
          <section className="overflow-hidden rounded border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border bg-surface-muted px-3 py-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  current turn
                </p>
                {thread.current_turn.reasoning_effort ? (
                  <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                    reasoning {thread.current_turn.reasoning_effort}
                  </span>
                ) : null}
              </div>
              {hasActiveCurrentTurn ? (
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
              ) : null}
            </div>
            <div className="space-y-2 p-3">
              <TurnBody turn={thread.current_turn} outputRef={outputRef} />
            </div>
          </section>
        ) : null}

        {thread?.queued_turns?.length ? (
          <section className="overflow-hidden rounded border border-border bg-surface">
            <div className="border-b border-border bg-surface-muted px-3 py-1.5">
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                queued turns
              </p>
            </div>
            <div className="space-y-2 p-3">
              {thread.queued_turns.map((queued, index) => (
                <UserInputBlock
                  key={queued.queue_id ?? index}
                  label="queued"
                  text={queued.prompt}
                />
              ))}
            </div>
          </section>
        ) : null}

        <div ref={threadEndRef} aria-hidden="true" />

        {thread ? (
          <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 p-2.5 backdrop-blur md:left-[13rem]">
            <div className="mx-auto flex max-w-3xl items-end gap-1.5">
              {hasActiveCurrentTurn ? (
                <div className="grid w-24 shrink-0 grid-cols-1 overflow-hidden rounded border border-border bg-surface text-[11px]">
                  <button
                    type="button"
                    onClick={() => setActivePromptMode("steer")}
                    className={`px-2 py-1 text-left ${
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
                    className={`border-t border-border px-2 py-1 text-left ${
                      activePromptMode === "queue"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-surface-muted"
                    }`}
                  >
                    Queue
                  </button>
                </div>
              ) : null}
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Codex turn prompt"
                placeholder={
                  hasActiveCurrentTurn
                    ? activePromptMode === "steer"
                      ? "Steer the active turn…"
                      : "Queue a follow-up turn…"
                    : "Start a Codex turn…"
                }
                className="flex-1 resize-none rounded border border-border bg-surface p-2 text-[12.5px] text-foreground focus:border-ring focus:outline-none"
                rows={1}
              />
              <Button
                onClick={handleStartTurn}
                disabled={!isConnected || !prompt.trim()}
                size="sm"
                aria-label={
                  hasActiveCurrentTurn
                    ? activePromptMode === "steer"
                      ? "Steer active turn"
                      : "Queue follow-up turn"
                    : "Start Codex turn"
                }
                title={
                  isConnected
                    ? hasActiveCurrentTurn
                      ? activePromptMode === "steer"
                        ? "Steer active turn"
                        : "Queue follow-up turn"
                      : "Start Codex turn"
                    : "Thread disconnected"
                }
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : null}

        {!thread ? (
          loadError ? (
            <div className="mx-auto mt-12 max-w-md rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-[12px] text-destructive">
              {loadError}
            </div>
          ) : (
            <div className="py-12 text-center text-[12px] text-muted-foreground">
              {isConnected ? "Loading…" : "Connecting…"}
            </div>
          )
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default SessionDetail;
