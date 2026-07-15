import type { ThreadInfo, TurnInfo } from "../types/session";

const isActiveTurn = (turn: TurnInfo | null | undefined) =>
  turn?.status === "running" || turn?.status === "waiting";

const longerText = (a: string | undefined, b: string | undefined) =>
  (a ?? "").length >= (b ?? "").length ? (a ?? "") : (b ?? "");

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
  const prevTurn = prev.current_turn;
  if (!prevTurn) return next;

  if (next.current_turn?.turn_id === prevTurn.turn_id) {
    // Same turn: the streamed buffers are usually ahead of the snapshot.
    return {
      ...next,
      current_turn: {
        ...next.current_turn,
        accumulated_output: longerText(
          prevTurn.accumulated_output,
          next.current_turn.accumulated_output,
        ),
        accumulated_stderr: longerText(
          prevTurn.accumulated_stderr,
          next.current_turn.accumulated_stderr,
        ),
      },
    };
  }

  const snapshotKnowsPrevTurn = next.turn_history.some(
    (turn) => turn.turn_id === prevTurn.turn_id,
  );
  const nextStarted = next.current_turn
    ? Date.parse(next.current_turn.started_at)
    : Number.NaN;
  const snapshotTurnIsNewer =
    Number.isFinite(nextStarted) && nextStarted > Date.parse(prevTurn.started_at);
  if (isActiveTurn(prevTurn) && !snapshotKnowsPrevTurn && !snapshotTurnIsNewer) {
    // The snapshot predates the currently streaming turn; keep streaming.
    return { ...next, current_turn: prevTurn, status: prev.status };
  }
  return next;
};
