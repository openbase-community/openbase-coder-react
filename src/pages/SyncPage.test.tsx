// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import SyncPage from "./SyncPage";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/components/layouts/DashboardLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const fetchMock = vi.mocked(apiFetch);

const jsonResponse = (data: unknown) =>
  new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  fetchMock.mockReset();
});

afterEach(() => {
  cleanup();
});

it("shows the Openbase Sync card and the explainer, with no legacy sync routes", async () => {
  fetchMock.mockImplementation(async (url) =>
    String(url).includes("/pairing/candidates/")
      ? jsonResponse({ signed_in: true, role: "none", candidates: [] })
      : jsonResponse({ configured: false, roots: [] }),
  );

  render(<SyncPage />);

  expect(await screen.findByText("not syncing")).toBeTruthy();
  expect(screen.getByText("How Openbase Sync works")).toBeTruthy();
  expect(screen.getByText(/never file-synced/)).toBeTruthy();
  expect(
    screen.getByText("openbase-coder sync-daemon pair hub"),
  ).toBeTruthy();
  expect(
    screen.getByText("openbase-coder sync migrate-from-syncthing"),
  ).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/syncthing engine/i);

  const urls = fetchMock.mock.calls.map(([url]) => String(url));
  expect(urls).toContain("/api/sync/daemon/settings/");
  expect(urls.every((url) => url.startsWith("/api/sync/daemon/"))).toBe(true);
});
