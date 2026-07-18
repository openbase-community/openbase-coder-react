import { getRuntimeShell } from "../runtime-config";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runtime shell separation", () => {
  it("defaults to the unchanged web shell", () => {
    vi.stubGlobal("window", {
      __OPENBASE_RUNTIME_CONFIG__: undefined,
    });

    expect(getRuntimeShell()).toBe("web");
  });

  it("selects desktop views only when Electron opts in", () => {
    vi.stubGlobal("window", {
      __OPENBASE_RUNTIME_CONFIG__: { shell: "electron" },
    });

    expect(getRuntimeShell()).toBe("electron");
  });
});
