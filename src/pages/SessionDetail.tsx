import DashboardLayout from "@/components/layouts/ExampleLayout";
import { RunDetail } from "@/components/RunDetail";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSessionWebSocket } from "@/hooks/use-session-websocket";
import { FolderOpen, Send, Square, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

const SessionDetail = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { session, isConnected, sendMessage, cancelRun } =
    useSessionWebSocket(sessionId);
  const [message, setMessage] = useState("");
  const outputRef = useRef<HTMLPreElement>(null);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [session?.current_run?.accumulated_output]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isRunning = session?.status === "running";

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24">
        {/* Connection indicator */}
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-green-600">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500" />
              <span className="text-red-600">Disconnected</span>
            </>
          )}
        </div>

        {/* Info card */}
        {session && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-base">
                <FolderOpen className="h-4 w-4" />
                {session.directory.split("/").pop()}
                <StatusBadge status={session.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-500 space-y-1">
              <div>{session.directory}</div>
              <div className="text-xs">Session: {session.session_id}</div>
            </CardContent>
          </Card>
        )}

        {/* Current run */}
        {session?.current_run && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>Current Run</span>
                {isRunning && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={cancelRun}
                  >
                    <Square className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <span className="font-medium">Message:</span>{" "}
                {session.current_run.message}
              </div>
              {session.current_run.accumulated_output && (
                <pre
                  ref={outputRef}
                  className="text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap"
                >
                  {session.current_run.accumulated_output}
                </pre>
              )}
              {session.current_run.accumulated_stderr && (
                <pre className="text-xs bg-red-950 text-red-200 p-3 rounded-lg overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {session.current_run.accumulated_stderr}
                </pre>
              )}
            </CardContent>
          </Card>
        )}

        {/* Run history */}
        {session && session.run_history.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Run History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {[...session.run_history].reverse().map((run) => (
                <RunDetail key={run.run_id} run={run} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Message input bar */}
        {session && !isRunning && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
            <div className="max-w-4xl mx-auto flex gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a message to Claude..."
                className="flex-1 resize-none border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={1}
              />
              <Button onClick={handleSend} disabled={!message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {!session && (
          <div className="text-center text-gray-400 py-16">
            {isConnected ? "Loading session..." : "Connecting..."}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SessionDetail;
