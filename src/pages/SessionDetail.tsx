import DashboardLayout from "@/components/layouts/ExampleLayout";
import { RunDetail } from "@/components/RunDetail";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useThreadWebSocket } from "@/hooks/use-session-websocket";
import { ArrowLeft, FolderOpen, Send, Square, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

const SessionDetail = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { thread, isConnected, startTurn, interruptTurn } =
    useThreadWebSocket(threadId);
  const [prompt, setPrompt] = useState("");
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [thread?.current_turn?.accumulated_output]);

  const handleStartTurn = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    startTurn(trimmed);
    setPrompt("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleStartTurn();
    }
  };

  const isRunning = thread?.status === "running";
  const projectName = (path: string) => path.split("/").pop() || path;
  const fromProjectPath = searchParams.get("fromProject");
  const openProject = () => {
    if (!thread?.directory) return;
    navigate(`/dashboard/project?path=${encodeURIComponent(thread.directory)}`);
  };
  const goBackToProject = () => {
    if (!fromProjectPath) return;
    navigate(`/dashboard/project?path=${encodeURIComponent(fromProjectPath)}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-3 pb-24">
        {thread ? (
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
                {projectName(thread.directory)}
              </h1>
              <StatusBadge status={thread.status} />
              {thread.is_livekit_active_target ? (
                <span className="font-mono text-[10px] text-warning">voice</span>
              ) : thread.is_livekit_dispatcher || thread.is_livekit_shared ? (
                <span className="font-mono text-[10px] text-warning">dispatch</span>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={openProject}
                className="h-6 px-2 text-[11px]"
              >
                <FolderOpen className="h-3 w-3" />
                Project
              </Button>
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
        ) : null}

        {thread?.current_turn ? (
          <section className="overflow-hidden rounded border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border bg-surface-muted px-3 py-1.5">
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                current turn
              </p>
              {isRunning ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={interruptTurn}
                  className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Square className="h-2.5 w-2.5" />
                  Interrupt
                </Button>
              ) : null}
            </div>
            <div className="space-y-2 p-3">
              <div className="rounded border border-border bg-surface-muted px-2.5 py-1.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  prompt
                </p>
                <p className="mt-0.5 text-[12.5px] text-foreground">
                  {thread.current_turn.prompt}
                </p>
              </div>
              {thread.current_turn.accumulated_output ? (
                <pre
                  ref={outputRef}
                  className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-foreground p-2.5 font-mono text-[11.5px] text-background"
                >
                  {thread.current_turn.accumulated_output}
                </pre>
              ) : null}
              {thread.current_turn.accumulated_stderr ? (
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-destructive/95 p-2.5 font-mono text-[11.5px] text-destructive-foreground">
                  {thread.current_turn.accumulated_stderr}
                </pre>
              ) : null}
            </div>
          </section>
        ) : null}

        {thread && thread.turn_history.length > 0 ? (
          <section className="overflow-hidden rounded border border-border bg-surface">
            <div className="border-b border-border bg-surface-muted px-3 py-1.5">
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                turn history
              </p>
            </div>
            <div className="space-y-px p-2">
              {[...thread.turn_history].reverse().map((turn) => (
                <RunDetail key={turn.turn_id} run={turn} />
              ))}
            </div>
          </section>
        ) : null}

        {thread && !isRunning ? (
          <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 p-2.5 backdrop-blur md:left-[13rem]">
            <div className="mx-auto flex max-w-3xl gap-1.5">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Start a Codex turn…"
                className="flex-1 resize-none rounded border border-border bg-surface p-2 text-[12.5px] text-foreground focus:border-ring focus:outline-none"
                rows={1}
              />
              <Button
                onClick={handleStartTurn}
                disabled={!prompt.trim()}
                size="sm"
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : null}

        {!thread ? (
          <div className="py-12 text-center text-[12px] text-muted-foreground">
            {isConnected ? "Loading…" : "Connecting…"}
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default SessionDetail;
