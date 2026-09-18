// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { fleetApiPath, peerBackendBaseUrl, peerWebSocketUrl } from "../fleet";

function setBackendBaseUrl(url: string | undefined) {
  window.__OPENBASE_RUNTIME_CONFIG__ = url ? { backendBaseUrl: url } : {};
}

afterEach(() => {
  delete window.__OPENBASE_RUNTIME_CONFIG__;
});

describe("peerBackendBaseUrl", () => {
  it("uses the plain tailnet port for an http-served console", () => {
    setBackendBaseUrl("http://127.0.0.1:7999");
    expect(peerBackendBaseUrl("mini.tail1234.ts.net")).toBe(
      "http://mini.tail1234.ts.net:18080",
    );
  });

  it("stays on TLS for an https-served console", () => {
    setBackendBaseUrl("https://laptop.tail1234.ts.net");
    expect(peerBackendBaseUrl("mini.tail1234.ts.net")).toBe(
      "https://mini.tail1234.ts.net",
    );
  });
});

describe("fleetApiPath", () => {
  it("leaves local items on the selected backend", () => {
    setBackendBaseUrl("http://127.0.0.1:7999");
    expect(fleetApiPath(null, "/api/approval-requests/1/")).toBe(
      "/api/approval-requests/1/",
    );
    expect(fleetApiPath(undefined, "/api/routines/")).toBe("/api/routines/");
  });

  it("routes fleet items directly to the owning device", () => {
    setBackendBaseUrl("http://127.0.0.1:7999");
    expect(fleetApiPath("mini.tail1234.ts.net", "/api/routines/daily/")).toBe(
      "http://mini.tail1234.ts.net:18080/api/routines/daily/",
    );
  });
});

describe("peerWebSocketUrl", () => {
  it("swaps to the ws scheme matching the peer base", () => {
    setBackendBaseUrl("http://127.0.0.1:7999");
    expect(peerWebSocketUrl("mini.tail1234.ts.net", "/ws/threads/t1/")).toBe(
      "ws://mini.tail1234.ts.net:18080/ws/threads/t1/",
    );
    setBackendBaseUrl("https://laptop.tail1234.ts.net");
    expect(peerWebSocketUrl("mini.tail1234.ts.net", "/ws/threads/t1/")).toBe(
      "wss://mini.tail1234.ts.net/ws/threads/t1/",
    );
  });
});
