export type ThreadTurnAction = "start" | "queue" | "steer";

export const threadTurnActionPath = (
  threadId: string,
  action: ThreadTurnAction,
) => {
  const suffix = action === "start" ? "" : `${action}/`;
  return `/api/threads/${threadId}/turns/${suffix}`;
};

// Returns null when the outcome is a plain turn start: the thread view already
// shows the running turn, so a "Turn started" toast is just noise.
export const threadTurnActionMessage = (
  action: ThreadTurnAction,
  result: Record<string, unknown>,
): string | null => {
  if (action === "queue") {
    return result.queued ? "Turn queued" : null;
  }
  if (action === "steer") {
    if (result.queued) return "Active turn ended; follow-up queued";
    if (result.startedImmediately || result.steered === false) {
      return "Active turn ended; follow-up started";
    }
    return "Steering sent";
  }
  return null;
};

export const promptAfterThreadTurnSubmission = (
  current: string,
  submitted: string,
  accepted: boolean,
) => (accepted && current.trim() === submitted ? "" : current);
