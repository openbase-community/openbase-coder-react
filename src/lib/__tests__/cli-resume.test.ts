import { describe, expect, it } from "vitest";

import {
  cliResumeCommand,
  cliResumeCommands,
  codexCliResumeCommand,
} from "../cli-resume";

describe("cliResumeCommand", () => {
  it("builds a cd && claude --resume command", () => {
    expect(
      cliResumeCommand(
        "~/Projects/openbase-cloud-workspace",
        "44bc456e-3f2c-4130-bb68-55ef84ea6d55",
      ),
    ).toBe(
      "cd ~/Projects/openbase-cloud-workspace && claude --resume 44bc456e-3f2c-4130-bb68-55ef84ea6d55",
    );
  });

  it("quotes directories with spaces or quotes", () => {
    expect(cliResumeCommand("/tmp/my project", "abc")).toBe(
      "cd '/tmp/my project' && claude --resume abc",
    );
    expect(cliResumeCommand("/tmp/o'brien", "abc")).toBe(
      "cd '/tmp/o'\\''brien' && claude --resume abc",
    );
  });

  it("builds a cd && codex resume command for Openbase Codex threads", () => {
    expect(
      codexCliResumeCommand(
        "~/Projects/openbase-coder-workspace",
        "019f7ce0-eb0e-7b11-80be-457c6c2c537d",
      ),
    ).toBe(
      "cd ~/Projects/openbase-coder-workspace && CODEX_HOME=~/.openbase/codex_home codex resume 019f7ce0-eb0e-7b11-80be-457c6c2c537d",
    );
  });

  it("selects the codex resume command from backend metadata", () => {
    expect(
      cliResumeCommands({
        backend: "codex",
        directory: "/tmp/project",
        threadId: "thread-1",
      }),
    ).toEqual([
      {
        command:
          "cd /tmp/project && CODEX_HOME=~/.openbase/codex_home codex resume thread-1",
        description: "Open this thread's conversation in Codex CLI:",
        label: "Resume in Codex CLI",
        target: "codex",
      },
    ]);
  });

  it("keeps claude resume available for backend sessions", () => {
    expect(
      cliResumeCommands({
        backend: "claude_code",
        backendSessionId: "claude-session",
        directory: "/tmp/project",
        threadId: "thread-1",
      })[0]?.command,
    ).toBe("cd /tmp/project && claude --resume claude-session");
  });
});
