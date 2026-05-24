import type { ThreadInfo } from "@/types/session";

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
