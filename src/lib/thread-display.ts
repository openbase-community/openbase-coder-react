import type { ThreadInfo } from "@/types/session";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const basename = (path: string) => {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed.split("/").pop() || trimmed || path;
};

const firstPresent = (...values: Array<string | null | undefined>) =>
  values.find((value) => value && value.trim())?.trim();

export const isDispatcherThread = (thread: ThreadInfo) =>
  Boolean(thread.is_livekit_dispatcher || thread.is_livekit_shared);

export const threadDisplayName = (thread: ThreadInfo) =>
  isDispatcherThread(thread)
    ? "dispatcher"
    : firstPresent(thread.name, thread.title, thread.preview) ||
      basename(thread.directory) ||
      thread.thread_id;

export const threadListDisplayNames = (threads: ThreadInfo[]) => {
  const dispatcherThreads = threads.filter(isDispatcherThread);
  const useNumberedDispatchers = dispatcherThreads.length > 1;
  const dispatcherNames = new Map(
    dispatcherThreads.map((thread, index) => [
      thread.thread_id,
      useNumberedDispatchers ? `dispatcher-${index + 1}` : "dispatcher",
    ]),
  );

  return new Map(
    threads.map((thread) => [
      thread.thread_id,
      dispatcherNames.get(thread.thread_id) ??
        firstPresent(thread.name, thread.title, thread.preview) ??
        basename(thread.directory) ??
        thread.thread_id,
    ]),
  );
};

export const threadProjectLabel = (thread: ThreadInfo) =>
  basename(thread.directory) || thread.directory;

export const threadVoiceLabel = (thread: ThreadInfo) =>
  firstPresent(
    thread.livekit_active_target_voice_name,
    thread.livekit_dispatcher_voice_name,
    thread.livekit_voice_name,
  ) || "voice";

export const hasHistoricalVoice = (thread: ThreadInfo) =>
  Boolean(
    !thread.is_livekit_active_target &&
      !thread.is_livekit_dispatcher &&
      !thread.is_livekit_shared &&
      (thread.livekit_voice_id || thread.livekit_voice_name),
  );

export const isPriorityThread = (thread: ThreadInfo) =>
  Boolean(
    thread.is_livekit_active_target ||
      thread.is_livekit_dispatcher ||
      thread.is_livekit_shared,
  );

export const shouldDeemphasizeThread = (thread: ThreadInfo) =>
  thread.status !== "running" && !isPriorityThread(thread);

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const localDayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const relativeThreadDayLabel = (value: string, now = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  const dayDiff = Math.round(
    (startOfLocalDay(date).getTime() - startOfLocalDay(now).getTime()) /
      MS_PER_DAY,
  );
  if (dayDiff === 0) return "Today";
  if (dayDiff === -1) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
};

export const groupThreadsByDay = (threads: ThreadInfo[], now = new Date()) => {
  const groups: Array<{ key: string; label: string; threads: ThreadInfo[] }> = [];
  const byKey = new Map<string, (typeof groups)[number]>();

  threads.forEach((thread) => {
    const date = new Date(thread.updated_at);
    const key = Number.isNaN(date.getTime()) ? "unknown" : localDayKey(date);
    let group = byKey.get(key);
    if (!group) {
      group = {
        key,
        label: relativeThreadDayLabel(thread.updated_at, now),
        threads: [],
      };
      byKey.set(key, group);
      groups.push(group);
    }
    group.threads.push(thread);
  });

  return groups;
};
