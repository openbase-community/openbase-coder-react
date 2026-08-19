import { useAuth } from "@/contexts/auth";
import { getValidAccessToken } from "@/lib/jwt-auth";
import {
  type ApprovalRequest,
  parseApprovalRequestsMessage,
} from "@/lib/approval-requests";
import { getBackendWebSocketUrl } from "@/lib/runtime-config";
import { useCallback, useEffect, useRef, useState } from "react";

type UseApprovalRequestsWebSocketOptions = {
  onSnapshot: (requests: ApprovalRequest[]) => void;
};

export function useApprovalRequestsWebSocket({
  onSnapshot,
}: UseApprovalRequestsWebSocketOptions) {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectDelayRef = useRef(1000);
  const connectAttemptRef = useRef(0);
  const onSnapshotRef = useRef(onSnapshot);

  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
  }, [onSnapshot]);

  const connect = useCallback(async () => {
    if (!token) return;

    const attempt = ++connectAttemptRef.current;
    const freshToken = (await getValidAccessToken()) ?? token;
    if (attempt !== connectAttemptRef.current) return;

    const baseUrl = getBackendWebSocketUrl("/ws/approval-requests/");
    const ws = new WebSocket(`${baseUrl}?token=${encodeURIComponent(freshToken)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectDelayRef.current = 1000;
    };

    ws.onmessage = (event) => {
      const message = parseApprovalRequestsMessage(event.data);
      if (message) onSnapshotRef.current(message.data.requests);
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      setIsConnected(false);
      wsRef.current = null;
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000);
        void connect();
      }, reconnectDelayRef.current);
    };
  }, [token]);

  useEffect(() => {
    void connect();

    return () => {
      connectAttemptRef.current++;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [connect]);

  return isConnected;
}
