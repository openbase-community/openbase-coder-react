import { describe, expect, it } from "vitest";

import { cliResumeCommand } from "../cli-resume";

describe("cliResumeCommand", () => {
  it("builds a cd && claude --resume command", () => {
    expect(
      cliResumeCommand(
        "/Users/gabe/Projects/openbase-cloud-workspace",
        "44bc456e-3f2c-4130-bb68-55ef84ea6d55",
      ),
    ).toBe(
      "cd /Users/gabe/Projects/openbase-cloud-workspace && claude --resume 44bc456e-3f2c-4130-bb68-55ef84ea6d55",
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
});
