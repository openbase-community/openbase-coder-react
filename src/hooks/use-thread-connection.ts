import { useAuth } from "@/contexts/auth";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { getValidAccessToken } from "@/lib/jwt-auth";
import { fleetApiPath, peerWebSocketUrl } from "@/lib/fleet";
import { getBackendWebSocketUrl } from "@/lib/runtime-config";
import {
  mergeThreadTurnHistory,
  reconcileThreadSnapshot,
} from "@/lib/thread-reconcile";
import {
  type ThreadTurnAction,
  threadTurnActionMessage,
  threadTurnActionPath,
} from "@/lib/thread-turn-actions";
import type { ThreadInfo } from "@/types/session";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// Last-known snapshot per thread, kept across mounts (stale-while-revalidate):
// re-opening a thread paints the previous state instantly while the socket and
// refresh converge on fresh data. Bounded so long console sessions that touch
// many threads don't retain every transcript.
const SNAPSHOT_CACHE_LIMIT = 12;
const threadSnapshotCache = new Map<string, ThreadInfo>();
const cacheSnapshot = (id: string, snapshot: ThreadInfo) => {
  threadSnapshotCache.delete(id);
  threadSnapshotCache.set(id, snapshot);
  if (threadSnapshotCache.size > SNAPSHOT_CACHE_LIMIT) {
    const oldest = threadSnapshotCache.keys().next().value;
    if (oldest !== undefined) threadSnapshotCache.delete(oldest);
  }
};

// While the live socket is open it already pushes every state change; the
// interval/focus refreshes then only serve as a convergence safety net, so
// they are skipped unless the last full snapshot is at least this old.
const SOCKET_SAFETY_REFRESH_MS = 30_000;

export function useThreadConnection(threadId: string | undefined) {
  const { token } = useAuth();
  const cachedSnapshot = threadId ? threadSnapshotCache.get(threadId) : undefined;
  const [thread, setThread] = useState<ThreadInfo | null>(cachedSnapshot ?? null);
  // A thread that only exists on a peer device is streamed and mutated by
  // connecting DIRECTLY to that device. The first fleet-scoped detail fetch
  // discovers the origin host; once known it sticks for the page's lifetime
  // (the socket and every action then bypass the selected backend). A cached
  // snapshot seeds it so a revisit connects straight to the peer instead of
  // waterfalling through the selected backend first.
  const [originHost, setOriginHost] = useState<string | null>(
    cachedSnapshot?.origin_host ?? null,
  );
  const [isConnected, setIsConnected] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingOlderTurns, setIsLoadingOlderTurns] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectDelayRef = useRef(1000);
  const connectAttemptRef = useRef(0);
  const lastSnapshotAtRef = useRef(0);
  // A cache-seeded origin host may be stale (peer offline, thread migrated);
  // until one fetch against it succeeds, a failure falls back to the selected
  // backend instead of surfacing an error over perfectly reachable data. The
  // failed host is then pinned for this mount so snapshot discovery doesn't
  // re-adopt it and thrash the socket between the two hosts.
  const hostVerifiedRef = useRef(false);
  const failedHostRef = useRef<string | null>(null);

  // Keep the cross-mount cache current so the next visit paints instantly.
  useEffect(() => {
    if (threadId && thread) cacheSnapshot(threadId, thread);
  }, [threadId, thread]);

  const refreshThread = useCallback(async () => {
    if (!threadId) return;
    // This runs on an interval, so failures update a persistent inline error
    // instead of toasting on every tick.
    try {
      const res = await apiFetch(
        fleetApiPath(originHost, `/api/threads/${threadId}/?scope=fleet`),
      );
      if (!res.ok) {
        if (originHost && !hostVerifiedRef.current) {
          failedHostRef.current = originHost;
          setOriginHost(null);
          return;
        }
        setLoadError(
          await extractErrorMessage(
            res,
            `Unable to load thread (HTTP ${res.status}).`,
          ),
        );
        return;
      }
      const snapshot: ThreadInfo = await res.json();
      if (originHost) hostVerifiedRef.current = true;
      lastSnapshotAtRef.current = Date.now();
      if (snapshot.origin_host && snapshot.origin_host !== failedHostRef.current) {
        setOriginHost(snapshot.origin_host);
      }
      setThread((prev) => reconcileThreadSnapshot(prev, snapshot));
      setLoadError(null);
    } catch {
      if (originHost && !hostVerifiedRef.current) {
        failedHostRef.current = originHost;
        setOriginHost(null);
        return;
      }
      setLoadError("Unable to reach the local API.");
    }
  }, [threadId, originHost]);

  const refreshIfStale = useCallback(() => {
    const socketOpen = wsRef.current?.readyState === WebSocket.OPEN;
    if (
      socketOpen &&
      Date.now() - lastSnapshotAtRef.current < SOCKET_SAFETY_REFRESH_MS
    ) {
      return;
    }
    void refreshThread();
  }, [refreshThread]);

  const loadOlderTurns = useCallback(async () => {
    const cursor = thread?.history_next_cursor;
    if (!threadId || !cursor || isLoadingOlderTurns) return false;

    setIsLoadingOlderTurns(true);
    try {
      const query = new URLSearchParams({
        scope: "fleet",
        history_cursor: cursor,
      });
      const res = await apiFetch(
        fleetApiPath(originHost, `/api/threads/${threadId}/?${query}`),
      );
      if (!res.ok) {
        toast.error(
          await extractErrorMessage(
            res,
            `Unable to load older turns (HTTP ${res.status}).`,
          ),
        );
        return false;
      }
      const page: ThreadInfo = await res.json();
      setThread((prev) => {
        const combinedPage = prev
          ? {
              ...page,
              turn_history: mergeThreadTurnHistory(
                prev.turn_history,
                page.turn_history,
              ),
            }
          : page;
        const reconciled = reconcileThreadSnapshot(prev, combinedPage);
        return {
          ...reconciled,
          history_next_cursor: page.history_next_cursor,
        };
      });
      return true;
    } catch {
      toast.error("Unable to reach the local API.");
      return false;
    } finally {
      setIsLoadingOlderTurns(false);
    }
  }, [isLoadingOlderTurns, originHost, thread?.history_next_cursor, threadId]);

  const connect = useCallback(async () => {
    if (!threadId || !token) return;

    // A token captured at mount goes stale across long sessions; every
    // (re)connect attempt must authenticate with a currently valid token or
    // the server rejects the socket forever once the old one expires.
    const attempt = ++connectAttemptRef.current;
    const freshToken = (await getValidAccessToken()) ?? token;
    if (attempt !== connectAttemptRef.current) return;

    const baseUrl = originHost
      ? peerWebSocketUrl(originHost, `/ws/threads/${threadId}/`)
      : getBackendWebSocketUrl(`/ws/threads/${threadId}/`);
    const url = `${baseUrl}?token=${freshToken}`;

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
          30000,
        );
        void connect();
      }, reconnectDelayRef.current);
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        // Ignore malformed frames; the periodic refresh keeps state converging.
        return;
      }

      switch (msg.type) {
        case "thread_state":
          lastSnapshotAtRef.current = Date.now();
          setThread((prev) => reconcileThreadSnapshot(prev, msg.data));
          break;

        case "turn_started":
          setThread((prev) => {
            if (!prev) return prev;
            if (prev.current_turn?.turn_id === msg.data.turn_id) return prev;
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
            if (
              msg.data.turn_id &&
              msg.data.turn_id !== prev.current_turn.turn_id
            ) {
              // Stale delta from a previous turn; never render it under the
              // current turn.
              return prev;
            }
            const field =
              msg.data.stream === "stderr"
                ? "accumulated_stderr"
                : "accumulated_output";
            const suffix =
              msg.data.chunk === true ? msg.data.line : `${msg.data.line}\n`;
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
          lastSnapshotAtRef.current = Date.now();
          setThread((prev) => reconcileThreadSnapshot(prev, msg.data));
          break;

        case "turn_queued": {
          const queuedMessage = threadTurnActionMessage("queue", msg.data ?? {});
          if (queuedMessage) toast.success(queuedMessage);
          void refreshThread();
          break;
        }

        case "turn_steered": {
          const steeredMessage = threadTurnActionMessage("steer", msg.data ?? {});
          if (steeredMessage) toast.success(steeredMessage);
          void refreshThread();
          break;
        }

        case "error": {
          const message = msg.data?.message ?? "Server error";
          toast.error(message);
          break;
        }
      }
    };
  }, [threadId, token, originHost, refreshThread]);

  useEffect(() => {
    void connect();

    // With the socket open these are only a convergence safety net (see
    // SOCKET_SAFETY_REFRESH_MS); with it closed they are the sole data path
    // and fire on every tick.
    const interval = window.setInterval(refreshIfStale, 5000);
    const handleFocus = () => {
      refreshIfStale();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshIfStale();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      connectAttemptRef.current++;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, refreshIfStale]);

  const submitTurn = useCallback(
    async (action: ThreadTurnAction, prompt: string) => {
      if (!threadId) return false;
      try {
        const res = await apiFetch(
          fleetApiPath(originHost, threadTurnActionPath(threadId, action)),
          {
            method: "POST",
            body: JSON.stringify({ prompt }),
          },
        );
        if (!res.ok) {
          toast.error(
            await extractErrorMessage(
              res,
              `Unable to ${action} turn (HTTP ${res.status}).`,
            ),
          );
          return false;
        }
        const result = (await res.json()) as Record<string, unknown>;
        const message = threadTurnActionMessage(action, result);
        if (message) toast.success(message);
        await refreshThread();
        return true;
      } catch {
        toast.error("Unable to reach the local API.");
        return false;
      }
    },
    [refreshThread, threadId, originHost],
  );

  const startTurn = useCallback(
    (prompt: string) => submitTurn("start", prompt),
    [submitTurn],
  );
  const queueTurn = useCallback(
    (prompt: string) => submitTurn("queue", prompt),
    [submitTurn],
  );
  const steerTurn = useCallback(
    (prompt: string) => submitTurn("steer", prompt),
    [submitTurn],
  );

  const interruptTurn = useCallback(() => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      toast.error("Thread is not connected yet");
      return;
    }
    wsRef.current.send(JSON.stringify({ action: "interrupt_turn" }));
  }, []);

  return useMemo(
    () => ({
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
    }),
    [
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
    ],
  );
}
