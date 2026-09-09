import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/contexts/notifications";
import {
  type AppNotification,
  notificationTargetPath,
} from "@/lib/notifications";
import {
  Bell,
  FileText,
  GitMerge,
  MessageSquare,
  ShieldQuestion,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const KIND_ICONS = {
  thread: MessageSquare,
  report: FileText,
  approval: ShieldQuestion,
  sync_conflict: GitMerge,
} as const;

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const NotificationsDropdown = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();

  const openNotification = (notification: AppNotification) => {
    markRead([notification.id]);
    navigate(notificationTargetPath(notification));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-7 gap-1.5 rounded px-2 text-[12px] text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          title="Notifications"
          aria-label={
            unreadCount
              ? `Notifications (${unreadCount} unread)`
              : "Notifications"
          }
        >
          <Bell className="h-3.5 w-3.5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-semibold leading-none text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-80 text-[13px]">
        <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5 text-[12px]">
          Notifications
          {unreadCount > 0 ? (
            <button
              type="button"
              className="text-[11px] font-normal text-muted-foreground hover:text-foreground"
              onClick={(event) => {
                event.preventDefault();
                markAllRead();
              }}
            >
              Mark all read
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
            You're all caught up.
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => {
              const Icon = KIND_ICONS[notification.kind] ?? Bell;
              const unread = !notification.read_at;
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className="items-start gap-2 px-2 py-2"
                  onClick={() => openNotification(notification)}
                >
                  <Icon
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                      unread ? "text-foreground" : "text-muted-foreground"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={`min-w-0 flex-1 truncate text-[12px] ${
                          unread
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {notification.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatTimestamp(notification.created_at)}
                      </span>
                    </div>
                    {notification.body ? (
                      <p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
                        {notification.body}
                      </p>
                    ) : null}
                  </div>
                  {unread ? (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  ) : null}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsDropdown;
