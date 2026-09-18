// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HealthWarningsBanner } from "../HealthWarningsBanner";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
const fetchMock = vi.mocked(apiFetch);
const response = (freshness: unknown) => new Response(JSON.stringify({ warnings: [], freshness }), { status: 200 });

beforeEach(() => {
  window.__OPENBASE_RUNTIME_CONFIG__ = { shell: "electron", nonDeveloperInstall: false };
  fetchMock.mockReset();
});
afterEach(() => { cleanup(); delete window.__OPENBASE_RUNTIME_CONFIG__; });

it("refreshes on focus, clears verified components, and marks failed checks unknown", async () => {
  const stale = { enabled: true, components: [{ component: "API", state: "stale", reason: "old commit", action: "Restart API." }] };
  fetchMock.mockResolvedValueOnce(response(stale));
  render(<MemoryRouter><HealthWarningsBanner /></MemoryRouter>);
  await screen.findByText(/1 component needs refreshing/);
  expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
  fetchMock.mockResolvedValueOnce(response({ enabled: true, components: [] }));
  await act(async () => { window.dispatchEvent(new Event("focus")); });
  await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  fetchMock.mockRejectedValueOnce(new Error("offline"));
  await act(async () => { window.dispatchEvent(new Event("focus")); });
  await screen.findByText("Cannot verify 1 running component.");
});

it("falls back for a backend older than the capability", async () => {
  fetchMock.mockResolvedValueOnce(new Response("", { status: 405 }));
  fetchMock.mockResolvedValueOnce(response(undefined));
  render(<MemoryRouter><HealthWarningsBanner /></MemoryRouter>);
  await screen.findByText("Cannot verify 1 running component.");
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1][1]?.method).toBeUndefined();
});

it("production desktop requests only existing health checks", async () => {
  window.__OPENBASE_RUNTIME_CONFIG__.nonDeveloperInstall = true;
  fetchMock.mockResolvedValueOnce(response(undefined));
  render(<MemoryRouter><HealthWarningsBanner /></MemoryRouter>);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  expect(fetchMock.mock.calls[0][1]?.method).toBeUndefined();
  expect(screen.queryByRole("status")).toBeNull();
});
