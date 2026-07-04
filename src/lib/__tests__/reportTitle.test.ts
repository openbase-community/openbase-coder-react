import { describe, expect, it } from "vitest";
import { firstMarkdownTitle, reportDisplayName } from "../reportTitle";
import type { ReportsFile } from "../../types/session";

const reportFile: ReportsFile = {
  path: "daily-report.md",
  name: "daily-report.md",
  kind: "markdown",
  size: 100,
  updated_at: 1,
};

describe("report titles", () => {
  it("uses the first top-level markdown heading as the report display name", () => {
    expect(
      reportDisplayName(reportFile, {
        content: "Intro\n\n## Details\n\n# Executive Summary\n\nBody",
      }),
    ).toBe("Executive Summary");
  });

  it("falls back to the filename when no top-level title is available", () => {
    expect(
      reportDisplayName(reportFile, {
        content: "## Details\n\nBody",
      }),
    ).toBe("daily-report.md");
  });

  it("ignores top-level headings inside fenced code blocks", () => {
    expect(
      firstMarkdownTitle("```md\n# Not the Title\n```\n\n# Actual Title"),
    ).toBe("Actual Title");
  });
});
