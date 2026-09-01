import { afterEach, describe, expect, it, vi } from "vitest";

describe("local console launch authentication", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("consumes the owner capability before routing can drop the fragment", async () => {
    const stored = new Map<string, string>();
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: {
        hash: "#openbase-local-token=owner-capability",
        pathname: "/",
        search: "",
      },
      history: { replaceState },
      sessionStorage: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => stored.set(key, value),
      },
    });

    const auth = await import("../jwt-auth");

    expect(stored.get("openbase.local-api-token")).toBe("owner-capability");
    expect(replaceState).toHaveBeenCalledWith(null, "", "/");
    expect(await auth.getValidAccessToken()).toBe("owner-capability");
  });
});
