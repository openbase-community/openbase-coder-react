import { describe, expect, it } from "vitest";
import { nextReportIndexAfterDelete } from "../reportDetailNavigation";

describe("nextReportIndexAfterDelete", () => {
  it("moves to the next report when deleting from the middle", () => {
    expect(nextReportIndexAfterDelete(1, 3)).toBe(2);
  });

  it("moves to the previous report when deleting the last report", () => {
    expect(nextReportIndexAfterDelete(2, 3)).toBe(1);
  });

  it("returns no target when deleting the only report or an invalid index", () => {
    expect(nextReportIndexAfterDelete(0, 1)).toBe(-1);
    expect(nextReportIndexAfterDelete(-1, 3)).toBe(-1);
  });
});
