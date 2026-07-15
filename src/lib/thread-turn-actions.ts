export type ThreadTurnAction = "start" | "queue" | "steer";

export const threadTurnActionPath = (
  threadId: string,
  action: ThreadTurnAction,
) => {
  const suffix = action === "start" ? "" : `${action}/`;
  return `/api/threads/${threadId}/turns/${suffix}`;
};

export const threadTurnActionMessage = (
  action: ThreadTurnAction,
  result: Record<string, unknown>,
) => {
  if (action === "queue") {
    return result.queued ? "Turn queued" : "Turn started";
  }
  if (action === "steer") {
    if (result.queued) return "Active turn ended; follow-up queued";
    if (result.startedImmediately || result.steered === false) {
      return "Active turn ended; follow-up started";
    }
    return "Steering sent";
  }
  return "Turn started";
};

export const promptAfterThreadTurnSubmission = (
  current: string,
  submitted: string,
  accepted: boolean,
) => (accepted && current.trim() === submitted ? "" : current);
