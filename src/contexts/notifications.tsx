import { useAuth } from "@/contexts/auth";
import { useNotificationsWebSocket } from "@/hooks/use-notifications-websocket";
import {
  type AppNotification,
  type NotificationKind,
  type NotificationsSnapshot,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  notificationTargetPath,
} from "@/lib/notifications";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const POLL_FALLBACK_INTERVAL_MS = 30000;

type DesktopNotificationsBridge = {
  notify: (payload: { title: string; body: string; path: string }) => void;
  setBadgeCount: (count: number) => void;
};

function desktopNotificationsBridge(): DesktopNotificationsBridge | null {
  const bridge = (
    window as { __OPENBASE_NOTIFICATIONS__?: DesktopNotificationsBridge }
  ).__OPENBASE_NOTIFICATIONS__;
  return bridge && typeof bridge.notify === "function" ? bridge : null;
}

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (ids: string[]) => void;
  markAllRead: () => void;
  markEntityRead: (kind: NotificationKind, entityId: string) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [snapshot, setSnapshot] = useState<NotificationsSnapshot>({
    notifications: [],
    unread_count: 0,
  });
  // High-water mark for desktop OS notifications: the first snapshot after
  // startup only sets the baseline so existing unread items never replay as
  // toasts on every launch.
  const notifiedHighWaterRef = useRef<string | null>(null);

  const applySnapshot = useCallback((next: NotificationsSnapshot) => {
    setSnapshot(next);

    const bridge = desktopNotificationsBridge();
    if (!bridge) return;
    bridge.setBadgeCount(next.unread_count);

    const newestCreatedAt = next.notifications.reduce(
      (max, notification) =>
        notification.created_at > max ? notification.created_at : max,
      "",
    );
    const highWater = notifiedHighWaterRef.current;
    if (highWater === null) {
      notifiedHighWaterRef.current = newestCreatedAt;
      return;
    }
    const fresh = next.notifications.filter(
      (notification) =>
        !notification.read_at &&
        !notification.resolved_at &&
        notification.created_at > highWater,
    );
    for (const notification of fresh) {
      bridge.notify({
        title: notification.title,
        body: notification.body || "",
        path: notificationTargetPath(notification),
      });
    }
    if (newestCreatedAt > highWater) {
      notifiedHighWaterRef.current = newestCreatedAt;
    }
  }, []);

  const isConnected = useNotificationsWebSocket({ onSnapshot: applySnapshot });

  const refresh = useCallback(async () => {
    const next = await fetchNotifications();
    if (next) applySnapshot(next);
  }, [applySnapshot]);

  // HTTP polling fallback while the socket is down (and initial fill if the
  // socket can't connect at all).
  useEffect(() => {
    if (!isAuthenticated || isConnected) return;
    void refresh();
    const interval = setInterval(() => void refresh(), POLL_FALLBACK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, isConnected, refresh]);

  const markRead = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      // Optimistic: the store rewrite will push the authoritative snapshot.
      setSnapshot((current) => ({
        notifications: current.notifications.map((notification) =>
          ids.includes(notification.id) && !notification.read_at
            ? { ...notification, read_at: new Date().toISOString() }
            : notification,
        ),
        unread_count: Math.max(
          0,
          current.unread_count -
            current.notifications.filter(
              (notification) =>
                ids.includes(notification.id) && !notification.read_at,
            ).length,
        ),
      }));
      void markNotificationsRead({ ids });
    },
    [],
  );

  const markAllRead = useCallback(() => {
    setSnapshot((current) => ({
      notifications: current.notifications.map((notification) =>
        notification.read_at
          ? notification
          : { ...notification, read_at: new Date().toISOString() },
      ),
      unread_count: 0,
    }));
    void markAllNotificationsRead();
  }, []);

  const markEntityRead = useCallback(
    (kind: NotificationKind, entityId: string) => {
      void markNotificationsRead({ kind, entityId });
    },
    [],
  );

  return (
    <NotificationsContext.Provider
      value={{
        notifications: snapshot.notifications,
        unreadCount: snapshot.unread_count,
        markRead,
        markAllRead,
        markEntityRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider",
    );
  }
  return context;
}

/** Fire-and-forget "the user is looking at this entity" read signal. */
export function useMarkEntityRead(
  kind: NotificationKind,
  entityId: string | null | undefined,
) {
  const { notifications, markEntityRead } = useNotifications();
  // Also covers a notification that (re)opens while the user is already
  // viewing the entity — e.g. a turn finishing on the open thread page.
  const hasUnread = notifications.some(
    (notification) =>
      notification.kind === kind &&
      notification.entity_id === entityId &&
      !notification.read_at,
  );
  useEffect(() => {
    if (entityId) markEntityRead(kind, entityId);
  }, [kind, entityId, hasUnread, markEntityRead]);
}

/**
 * While the surface listing a whole kind is mounted (approvals queue, sync
 * conflicts), viewing it counts as reading every notification of that kind —
 * including ones that arrive while the user is looking at the list.
 */
export function useMarkKindReadWhileMounted(kind: NotificationKind) {
  const { notifications, markRead } = useNotifications();
  const unreadIds = notifications
    .filter(
      (notification) => notification.kind === kind && !notification.read_at,
    )
    .map((notification) => notification.id)
    .join(",");
  useEffect(() => {
    if (unreadIds) markRead(unreadIds.split(","));
  }, [unreadIds, markRead]);
}
