import { apiFetch } from "@/lib/api";
import { extractErrorMessage, readJson } from "@/lib/api-errors";
import { continuationRequestId } from "@/lib/continuation-request";
import { fleetApiPath } from "@/lib/fleet";
import type { ThreadInfo, ThreadMovedTo } from "@/types/session";

/** A durable machine a thread can be pushed to (the sync hub today). */
export interface DurableTarget {
  key: string;
  name: string;
  host: string;
  kind: string;
  online: boolean;
  /** Why this target cannot take the thread right now, if it cannot. */
  reason: string | null;
}

export interface PushOptions {
  thread_id: string;
  this_is_durable: boolean;
  /** Why the thread cannot leave right now (a running turn, …). */
  blocked_reason: string | null;
  moved_to: ThreadMovedTo | null;
  targets: DurableTarget[];
}

export interface PushResult {
  state: "moved";
  thread_id: string;
  operation_id: string | null;
  moved_to: ThreadMovedTo | null;
  turn_started: boolean;
  turn_error: string | null;
}

export class PushFailure extends Error {
  constructor(
    message: string,
    readonly code: string | null,
    /** False when the request may have been processed (keep its id). */
    readonly safeToRetry: boolean,
  ) {
    super(message);
  }
}

const pushPath = (thread: ThreadInfo, suffix = "") =>
  fleetApiPath(
    thread.origin_host,
    `/api/threads/${encodeURIComponent(thread.thread_id)}/push/${suffix}`,
  );

const requestKey = (thread: ThreadInfo, target: string) =>
  `openbase:thread-push:${thread.thread_id}:${target}`;

export async function loadPushOptions(thread: ThreadInfo): Promise<PushOptions> {
  const response = await apiFetch(pushPath(thread));
  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, "Unable to check durable machines"),
    );
  }
  return (await response.json()) as PushOptions;
}

/**
 * Push a thread. The request id is kept per thread and target until the
 * server gives a definite answer, so retrying after a dropped connection
 * finishes the same push instead of starting another one.
 */
export async function pushThread(
  thread: ThreadInfo,
  target: string,
  message: string,
): Promise<PushResult> {
  const key = requestKey(thread, target);
  let requestId: string;
  try {
    requestId = sessionStorage.getItem(key) ?? continuationRequestId();
    sessionStorage.setItem(key, requestId);
  } catch {
    requestId = continuationRequestId();
  }
  const forget = () => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Storage unavailable: nothing to forget.
    }
  };
  let response: Response;
  try {
    response = await apiFetch(pushPath(thread), {
      method: "POST",
      body: JSON.stringify({
        to: target,
        request_id: requestId,
        ...(message.trim() ? { message: message.trim() } : {}),
      }),
    });
  } catch {
    throw new PushFailure(
      "Connection lost during the push. Retry to finish it.",
      null,
      false,
    );
  }
  if (!response.ok) {
    const failure = await readJson<{
      error?: string;
      code?: string;
      safe_to_retry?: boolean;
    }>(response.clone());
    // A refused push is final: the next attempt is a new request.
    forget();
    throw new PushFailure(
      await extractErrorMessage(response, "Unable to push the thread"),
      failure?.code ?? null,
      Boolean(failure?.safe_to_retry),
    );
  }
  forget();
  return (await response.json()) as PushResult;
}

/** Retry an unfinished push, or ask the target and release the thread here. */
export async function resolveUnfinishedPush(
  thread: ThreadInfo,
  action: "retry" | "cancel",
): Promise<void> {
  const response = await apiFetch(
    pushPath(thread, action === "cancel" ? "cancel/" : ""),
    {
      method: "POST",
      body: JSON.stringify(
        action === "cancel" ? {} : { to: thread.moved_to?.host ?? undefined },
      ),
    },
  );
  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        action === "cancel" ? "Unable to cancel the push" : "Unable to retry the push",
      ),
    );
  }
}

/** Whether new turns are blocked here because the thread moved or is moving. */
export const isThreadMovedAway = (thread: ThreadInfo | null | undefined) =>
  Boolean(thread?.moved_to);
