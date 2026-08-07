import { describe, expect, it } from "vitest";
import {
  reportAssetDownloadPath,
  reportRelativeAssetPath,
} from "../reportMarkdownAssets";

describe("report markdown assets", () => {
  it("resolves top-level report assets relative to the reports root", () => {
    expect(
      reportRelativeAssetPath(
        "2026-07-20-question-based-payment-onboarding-redesign.md",
        "assets/question-subscription-onboarding/desktop-access-questions.png",
      ),
    ).toBe(
      "assets/question-subscription-onboarding/desktop-access-questions.png",
    );
  });

  it("resolves nested report assets beside the report file", () => {
    expect(
      reportRelativeAssetPath("daily/plan.md", "images/screenshot.png"),
    ).toBe("daily/images/screenshot.png");
  });

  it("allows parent references that remain inside the reports root", () => {
    expect(
      reportRelativeAssetPath("daily/plan.md", "../assets/screenshot.png"),
    ).toBe("assets/screenshot.png");
  });

  it("rejects parent references escaping the reports root", () => {
    expect(reportRelativeAssetPath("plan.md", "../outside.png")).toBeNull();
  });

  it("leaves non-local markdown image sources alone", () => {
    expect(
      reportRelativeAssetPath("plan.md", "https://example.com/a.png"),
    ).toBeNull();
    expect(
      reportRelativeAssetPath("plan.md", "data:image/png;base64,abc"),
    ).toBeNull();
    expect(reportRelativeAssetPath("plan.md", "/assets/a.png")).toBeNull();
  });

  it("builds the authenticated download endpoint for local report assets", () => {
    expect(
      reportAssetDownloadPath("/workspace/project", "reports/plan.md", "img.png"),
    ).toBe(
      "/api/projects/reports/download/?path=%2Fworkspace%2Fproject&file=reports%2Fimg.png",
    );
  });
});
