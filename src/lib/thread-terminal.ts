/** Wire protocol and view state for a thread's native-TUI terminal socket. */

import { isDispatcherThread } from "./thread-display";
import type { ThreadInfo } from "@/types/session";

export type ThreadTerminalTarget = "codex" | "claude_code";

export interface ThreadTerminalReady {
  backend: string;
  target: ThreadTerminalTarget;
  command: string;
  cwd: string;
  reattached: boolean;
}

export type ThreadTerminalControl =
  | { type: "ready"; data: ThreadTerminalReady }
  | { type: "exit"; data: { code: number | null } }
  | { type: "error"; data: { message: string } };

export type ThreadTerminalStatus =
  | { kind: "connecting" }
  | ({ kind: "running" } & ThreadTerminalReady)
  | { kind: "exited"; code: number | null; command?: string }
  | { kind: "error"; message: string };

export function parseThreadTerminalControl(
  raw: unknown,
): ThreadTerminalControl | null {
  if (typeof raw !== "string") return null;
  let message: unknown;
  try {
    message = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!message || typeof message !== "object") return null;
  const { type, data } = message as { type?: unknown; data?: unknown };
  if (!data || typeof data !== "object") return null;
  const payload = data as Record<string, unknown>;
  if (type === "ready" && typeof payload.command === "string") {
    return {
      type,
      data: {
        backend: String(payload.backend ?? ""),
        target: payload.target === "claude_code" ? "claude_code" : "codex",
        command: payload.command,
        cwd: String(payload.cwd ?? ""),
        reattached: payload.reattached === true,
      },
    };
  }
  if (type === "exit") {
    return {
      type,
      data: { code: typeof payload.code === "number" ? payload.code : null },
    };
  }
  if (type === "error" && typeof payload.message === "string") {
    return { type, data: { message: payload.message } };
  }
  return null;
}

export function threadTerminalStatusLabel(status: ThreadTerminalStatus) {
  switch (status.kind) {
    case "connecting":
      return "Connecting…";
    case "running":
      return status.target === "claude_code" ? "Claude Code" : "Codex";
    case "exited":
      return status.code === 0 || status.code === null
        ? "Exited"
        : `Exited (${status.code})`;
    case "error":
      return "Unavailable";
  }
}

/**
 * Whether a thread can open the Terminal tab. The Dispatcher's own chat runs
 * on a dedicated app-server and is steered by voice, so it keeps chat only;
 * the server reports any other reason a thread cannot open.
 */
export function threadSupportsTerminal(thread: ThreadInfo) {
  return !isDispatcherThread(thread);
}
