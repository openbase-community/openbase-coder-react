/** Terminal commands for reopening a thread's native transcript. */

const shellQuote = (value: string) =>
  /^[A-Za-z0-9_\-./~]+$/.test(value)
    ? value
    : `'${value.replace(/'/g, `'\\''`)}'`;

export type CliResumeTarget = "claude_code" | "codex";

export interface CliResumeCommand {
  command: string;
  description: string;
  label: string;
  target: CliResumeTarget;
}

export const claudeCliResumeCommand = (
  directory: string,
  backendSessionId: string,
) => `cd ${shellQuote(directory)} && claude --resume ${shellQuote(backendSessionId)}`;

export const codexCliResumeCommand = (directory: string, threadId: string) =>
  `cd ${shellQuote(directory)} && CODEX_HOME=~/.openbase/codex_home codex resume ${shellQuote(threadId)}`;

export const cliResumeCommand = (
  directory: string,
  backendSessionId: string,
) => claudeCliResumeCommand(directory, backendSessionId);

export const cliResumeCommands = ({
  backend,
  backendSessionId,
  directory,
  threadId,
}: {
  backend?: string | null;
  backendSessionId?: string | null;
  directory: string;
  threadId: string;
}): CliResumeCommand[] => {
  if (backend === "codex") {
    return [
      {
        command: codexCliResumeCommand(directory, threadId),
        description: "Open this thread's conversation in Codex CLI:",
        label: "Resume in Codex CLI",
        target: "codex",
      },
    ];
  }

  if (backend === "claude_code" || backendSessionId) {
    if (!backendSessionId) return [];
    return [
      {
        command: claudeCliResumeCommand(directory, backendSessionId),
        description: "Open this thread's conversation in Claude Code:",
        label: "Resume in Claude CLI",
        target: "claude_code",
      },
    ];
  }

  return [];
};
