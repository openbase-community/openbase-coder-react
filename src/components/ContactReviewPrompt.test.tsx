// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { ContactReviewPrompt } from "./ContactReviewPrompt";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

const fetchMock = vi.mocked(apiFetch);
const summary = (pending: number, skipped = 0) =>
  new Response(JSON.stringify({
    progress: { total: 10, categorized: 10 - pending, pending, skipped },
    sources: [],
    refreshed_at: null,
    errors: [],
  }));

function Location() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ContactReviewPrompt />
      <Routes>
        <Route path="*" element={<Location />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  fetchMock.mockReset();
  window.sessionStorage.clear();
});
afterEach(() => cleanup());

it("asks to review pending contacts and navigates to the queue", async () => {
  fetchMock.mockResolvedValue(summary(3, 1));
  renderAt("/dashboard/dispatch");
  expect(await screen.findByRole("status")).toHaveProperty(
    "textContent",
    expect.stringContaining("2 messaging contacts need a category · 7 of 10 categorized"),
  );
  fireEvent.click(screen.getByRole("button", { name: "Review contacts" }));
  expect(screen.getByTestId("location").textContent).toBe("/dashboard/contacts");
});

it("stays quiet when nothing is pending, on the contacts page, or after Later", async () => {
  fetchMock.mockResolvedValue(summary(0));
  renderAt("/dashboard/dispatch");
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect(screen.queryByRole("status")).toBeNull();
  cleanup();

  fetchMock.mockReset();
  fetchMock.mockResolvedValue(summary(2));
  renderAt("/dashboard/contacts");
  expect(screen.queryByRole("status")).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
  cleanup();

  renderAt("/dashboard/dispatch");
  fireEvent.click(await screen.findByRole("button", { name: "Later" }));
  expect(screen.queryByRole("status")).toBeNull();
  expect(window.sessionStorage.getItem("openbase-coder:contact-review-snoozed")).toBe("1");
});
