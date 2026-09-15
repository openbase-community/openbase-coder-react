import type { ThreadInfo, TurnInfo } from "../types/session";

const isActiveTurn = (turn: TurnInfo | null | undefined) =>
  turn?.status === "running" || turn?.status === "waiting";

const longerText = (a: string | undefined, b: string | undefined) =>
  (a ?? "").length >= (b ?? "").length ? (a ?? "") : (b ?? "");

export const mergeThreadTurnHistory = (
  current: TurnInfo[],
  incoming: TurnInfo[],
) => {
  const historyById = new Map(current.map((turn) => [turn.turn_id, turn]));
  incoming.forEach((turn) => historyById.set(turn.turn_id, turn));
  return [...historyById.values()].sort(
    (a, b) => Date.parse(a.started_at) - Date.parse(b.started_at),
  );
};

/**
 * Merge an incoming thread snapshot with the current state without losing
 * live-streamed progress. HTTP refreshes (and server-side reads) can resolve
 * after a newer turn already started over the socket; applying such a
 * snapshot wholesale briefly shows the previous turn's prompt and output as
 * if they belonged to the new turn.
 */
export const reconcileThreadSnapshot = (
  prev: ThreadInfo | null,
  next: ThreadInfo,
): ThreadInfo => {
  if (!prev || prev.thread_id !== next.thread_id) return next;

  const hasLoadedOlderPages =
    prev.turn_history.length > next.turn_history.length;
  const mergedNext: ThreadInfo = hasLoadedOlderPages
    ? {
        ...next,
        turn_history: mergeThreadTurnHistory(
          prev.turn_history,
          next.turn_history,
        ),
        history_next_cursor: prev.history_next_cursor,
      }
    : next;

  const prevTurn = prev.current_turn;
  if (!prevTurn) return mergedNext;

  if (mergedNext.current_turn?.turn_id === prevTurn.turn_id) {
    // Same turn: the streamed buffers are usually ahead of the snapshot.
    return {
      ...mergedNext,
      current_turn: {
        ...mergedNext.current_turn,
        accumulated_output: longerText(
          prevTurn.accumulated_output,
          mergedNext.current_turn.accumulated_output,
        ),
        accumulated_stderr: longerText(
          prevTurn.accumulated_stderr,
          mergedNext.current_turn.accumulated_stderr,
        ),
      },
    };
  }

  const snapshotKnowsPrevTurn = mergedNext.turn_history.some(
    (turn) => turn.turn_id === prevTurn.turn_id,
  );
  const nextStarted = mergedNext.current_turn
    ? Date.parse(mergedNext.current_turn.started_at)
    : Number.NaN;
  const snapshotTurnIsNewer =
    Number.isFinite(nextStarted) &&
    nextStarted > Date.parse(prevTurn.started_at);
  if (
    isActiveTurn(prevTurn) &&
    !snapshotKnowsPrevTurn &&
    !snapshotTurnIsNewer
  ) {
    // The snapshot predates the currently streaming turn; keep streaming.
    return { ...mergedNext, current_turn: prevTurn, status: prev.status };
  }
  return mergedNext;
};
