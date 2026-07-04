import { describe, expect, it } from "vitest";
import { groupReportItems, groupReportItemsByDay, relativeReportDayLabel } from "../reportGroups";
import type { ReportsFile } from "../../types/session";

const file = (
  path: string,
  updated_at: number,
  size = 100,
): ReportsFile => ({
  path,
  name: path.split("/").pop() ?? path,
  kind: "markdown",
  size,
  updated_at,
});

describe("groupReportItems", () => {
  it("keeps direct reports as files and groups first-level folders", () => {
    const nodes = groupReportItems(
      [
        file("summary.md", 1),
        file("run/a.md", 4, 50),
        file("run/nested/b.md", 3, 75),
        file("notes.txt", 2),
      ],
      (item) => item,
    );

    expect(nodes).toMatchObject([
      {
        type: "group",
        name: "run",
        size: 125,
        updated_at: 4,
        items: [{ path: "run/a.md" }, { path: "run/nested/b.md" }],
      },
      { type: "file", updated_at: 2, item: { path: "notes.txt" } },
      { type: "file", updated_at: 1, item: { path: "summary.md" } },
    ]);
  });

  it("sorts direct top-level reports by their own updated time among groups", () => {
    const nodes = groupReportItems(
      [
        file("epic-fhir/report.md", 10),
        file("azure-ad/report.md", 20),
        file("march-ai-health-activity-2026-05-20.md", 30),
      ],
      (item) => item,
    );

    expect(nodes).toMatchObject([
      {
        type: "file",
        updated_at: 30,
        item: { path: "march-ai-health-activity-2026-05-20.md" },
      },
      { type: "group", name: "azure-ad", updated_at: 20 },
      { type: "group", name: "epic-fhir", updated_at: 10 },
    ]);
  });

  it("separates same-named folders from different projects when scoped", () => {
    const nodes = groupReportItems(
      [
        { project: "/one", file: file("run/a.md", 1) },
        { project: "/two", file: file("run/b.md", 2) },
      ],
      (item) => item.file,
      (item) => item.project,
    );

    expect(nodes).toHaveLength(2);
    expect(nodes.map((node) => node.key)).toEqual(["/two:run", "/one:run"]);
  });
});

describe("report date grouping", () => {
  it("labels report days with the same Today, Yesterday, and older date semantics as threads", () => {
    const now = new Date(2026, 5, 30, 12);
    const today = new Date(2026, 5, 30, 9).getTime() / 1000;
    const yesterday = new Date(2026, 5, 29, 18).getTime() / 1000;
    const older = new Date(2026, 5, 20, 15).getTime() / 1000;

    expect(relativeReportDayLabel(today, now)).toBe("Today");
    expect(relativeReportDayLabel(yesterday, now)).toBe("Yesterday");
    expect(relativeReportDayLabel(older, now)).toBe("Saturday, Jun 20");
  });

  it("groups report nodes by local produced date before folder grouping", () => {
    const now = new Date(2026, 5, 30, 12);
    const sections = groupReportItemsByDay(
      [
        file("today.md", new Date(2026, 5, 30, 9).getTime() / 1000),
        file("run/a.md", new Date(2026, 5, 29, 18).getTime() / 1000),
        file("run/b.md", new Date(2026, 5, 29, 17).getTime() / 1000),
      ],
      (item) => item,
      () => "",
      now,
    );

    expect(sections.map((section) => section.label)).toEqual([
      "Today",
      "Yesterday",
    ]);
    expect(sections[0].nodes).toMatchObject([
      { type: "file", item: { path: "today.md" } },
    ]);
    expect(sections[1].nodes).toMatchObject([
      {
        type: "group",
        name: "run",
        items: [{ path: "run/a.md" }, { path: "run/b.md" }],
      },
    ]);
  });
});
