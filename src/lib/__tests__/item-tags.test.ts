import { apiFetch } from "@/lib/api";
import { setThreadTags } from "@/lib/item-tags";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("item tag API helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates thread tags through the thread tag endpoint", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      Response.json({
        tags: ["Needs Review"],
        tag_options: [{ slug: "needs-review", label: "Needs Review" }],
      }),
    );

    const result = await setThreadTags("thread/1", ["Needs Review"]);

    expect(apiFetch).toHaveBeenCalledWith("/api/threads/thread%2F1/tags/", {
      method: "PATCH",
      body: JSON.stringify({ tags: ["Needs Review"] }),
    });
    expect(result).toEqual({
      tags: ["Needs Review"],
      tag_options: [{ slug: "needs-review", label: "Needs Review" }],
    });
  });
});
