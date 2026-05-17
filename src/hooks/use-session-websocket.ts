import { useAuth } from "@/contexts/auth";
import { apiFetch } from "@/lib/api";
import { getBackendWebSocketUrl } from "@/lib/runtime-config";
import type { ThreadInfo } from "@/types/session";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function useThreadWebSocket(threadId: string | undefined) {
  const { token } = useAuth();
  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectDelayRef = useRef(1000);

  const refreshThread = useCallback(async () => {
    if (!threadId) return;
    const res = await apiFetch(`/api/threads/${threadId}/`);
    if (res.ok) {
      setThread(await res.json());
    }
  }, [threadId]);

  const connect = useCallback(() => {
    if (!threadId || !token) return;

    const baseUrl = getBackendWebSocketUrl(`/ws/threads/${threadId}/`);
    const url = `${baseUrl}?token=${token}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectDelayRef.current = 1000;
      void refreshThread();
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
        case "thread_state":
          setThread(msg.data);
          break;

        case "turn_started":
          setThread((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              current_turn: msg.data,
              status: "running",
            };
          });
          break;

        case "output_update":
          setThread((prev) => {
            if (!prev?.current_turn) return prev;
            const field =
              msg.data.stream === "stderr"
                ? "accumulated_stderr"
                : "accumulated_output";
            const suffix = msg.data.chunk === true ? msg.data.line : `${msg.data.line}\n`;
            return {
              ...prev,
              current_turn: {
                ...prev.current_turn,
                [field]: (prev.current_turn[field] || "") + suffix,
              },
            };
          });
          break;

        case "turn_completed":
          setThread(msg.data);
          break;

        case "error": {
          const message = msg.data?.message ?? "Server error";
          toast.error(message);
          break;
        }
      }
    };
  }, [threadId, token, refreshThread]);

  useEffect(() => {
    connect();

    const interval = window.setInterval(refreshThread, 5000);
    const handleFocus = () => {
      void refreshThread();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshThread();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, refreshThread]);

  const startTurn = useCallback(
    (prompt: string) => {
      wsRef.current?.send(
        JSON.stringify({ action: "start_turn", prompt })
      );
    },
    []
  );

  const interruptTurn = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ action: "interrupt_turn" }));
  }, []);

  return { thread, isConnected, startTurn, interruptTurn };
}
