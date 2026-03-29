import { useAuth } from "@/contexts/auth";
import { getBackendWebSocketUrl } from "@/lib/runtime-config";
import type { SessionInfo } from "@/types/session";
import { useCallback, useEffect, useRef, useState } from "react";

export function useSessionWebSocket(sessionId: string | undefined) {
  const { token } = useAuth();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectDelayRef = useRef(1000);

  const connect = useCallback(() => {
    if (!sessionId || !token) return;

    const baseUrl = getBackendWebSocketUrl(`/ws/sessions/${sessionId}/`);
    const url = `${baseUrl}?token=${token}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectDelayRef.current = 1000;
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      // Auto-reconnect with backoff
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(
          reconnectDelayRef.current * 2,
          30000
        );
        connect();
      }, reconnectDelayRef.current);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "session_state":
          setSession(msg.data);
          break;

        case "run_started":
          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              current_run: msg.data,
              status: "running",
            };
          });
          break;

        case "output_update":
          setSession((prev) => {
            if (!prev?.current_run) return prev;
            const field =
              msg.data.stream === "stderr"
                ? "accumulated_stderr"
                : "accumulated_output";
            return {
              ...prev,
              current_run: {
                ...prev.current_run,
                [field]:
                  (prev.current_run[field] || "") + msg.data.line + "\n",
              },
            };
          });
          break;

        case "run_completed":
          setSession(msg.data);
          break;
      }
    };
  }, [sessionId, token]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback(
    (message: string) => {
      wsRef.current?.send(
        JSON.stringify({ action: "send_message", message })
      );
    },
    []
  );

  const cancelRun = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ action: "cancel_run" }));
  }, []);

  return { session, isConnected, sendMessage, cancelRun };
}
