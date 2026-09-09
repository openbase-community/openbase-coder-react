import { apiFetch } from "@/lib/api";

export type NotificationKind =
  | "thread"
  | "report"
  | "approval"
  | "sync_conflict";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  entity_id: string;
  thread_id?: string | null;
  project_path?: string | null;
  title: string;
  body?: string | null;
  created_at: string;
  read_at?: string | null;
  resolved_at?: string | null;
};

export type NotificationsSnapshot = {
  notifications: AppNotification[];
  unread_count: number;
};

type NotificationsMessage = {
  type: "notifications";
  data: NotificationsSnapshot;
};

export function parseNotificationsMessage(
  raw: unknown,
): NotificationsMessage | null {
  if (typeof raw !== "string") return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!value || typeof value !== "object") return null;
  const message = value as Record<string, unknown>;
  if (message.type !== "notifications") return null;
  if (!message.data || typeof message.data !== "object") return null;

  const data = message.data as Record<string, unknown>;
  if (!Array.isArray(data.notifications)) return null;
  if (typeof data.unread_count !== "number") return null;
  if (
    data.notifications.some(
      (notification) =>
        !notification ||
        typeof notification !== "object" ||
        typeof (notification as Record<string, unknown>).id !== "string",
    )
  ) {
    return null;
  }

  return value as NotificationsMessage;
}

export async function fetchNotifications(): Promise<NotificationsSnapshot | null> {
  const res = await apiFetch("/api/notifications/");
  if (!res.ok) return null;
  const payload = (await res.json()) as NotificationsSnapshot;
  if (!Array.isArray(payload.notifications)) return null;
  return payload;
}

export async function markNotificationsRead(
  target: { ids: string[] } | { kind: NotificationKind; entityId: string },
): Promise<void> {
  const body =
    "ids" in target
      ? { ids: target.ids }
      : { kind: target.kind, entity_id: target.entityId };
  await apiFetch("/api/notifications/mark-read/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch("/api/notifications/mark-all-read/", { method: "POST" });
}

/** Route inside the console for one notification's subject. */
export function notificationTargetPath(notification: AppNotification): string {
  switch (notification.kind) {
    case "thread":
      return `/dashboard/threads/${encodeURIComponent(
        notification.thread_id || notification.entity_id,
      )}`;
    case "report": {
      const projectPath = notification.project_path || "";
      const entityId = notification.entity_id;
      // Report entity ids are "{project_path}:{relative_path}".
      const reportPath = projectPath
        ? entityId.slice(projectPath.length + 1)
        : "";
      if (projectPath && reportPath) {
        const params = new URLSearchParams({
          project: projectPath,
          report: reportPath,
        });
        return `/dashboard/reports?${params.toString()}`;
      }
      return "/dashboard/reports";
    }
    case "approval":
      return "/dashboard/approvals";
    case "sync_conflict":
      return "/dashboard/threads/sync-conflicts";
  }
}
