// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import type { ContactPerson, MessagingContactsSnapshot } from "@/lib/messaging-contacts";
import Contacts from "./Contacts";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/components/ConfigureTabs", () => ({ ConfigureTabs: () => null }));
vi.mock("@/components/layouts/DashboardLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const fetchMock = vi.mocked(apiFetch);
const jsonResponse = (data: unknown) =>
  new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });

// Synthetic people only; nothing here resembles a real contact.
const person = (key: string, name: string, extra: Partial<ContactPerson> = {}): ContactPerson => ({
  key,
  display_name: name,
  is_group: false,
  last_message_at: "2026-10-20T10:00:00Z",
  kinds: ["whatsapp"],
  read_allowed: false,
  send_allowed: false,
  identities: [
    {
      source_id: "whatsapp",
      kind: "whatsapp",
      contact_id: `${key}@s.whatsapp.net`,
      display_name: name,
      phone: null,
      email: null,
      is_group: false,
      last_message_at: "2026-10-20T10:00:00Z",
      read_allowed: false,
      send_allowed: false,
    },
  ],
  category: null,
  updated_at: null,
  skipped: false,
  skipped_until: null,
  ...extra,
});

const categories = [
  { id: "family", label: "Family", policy: "ask" as const },
  { id: "unknown", label: "Unknown or spam", policy: "block" as const },
];

const snapshot = (people: ContactPerson[], queue = people.filter((p) => !p.category && !p.skipped).map((p) => p.key)): MessagingContactsSnapshot => ({
  people,
  queue,
  categories,
  sources: [{ id: "whatsapp", kind: "whatsapp", label: "WhatsApp", ssh_target: null, merge: true }],
  progress: {
    total: people.length,
    categorized: people.filter((p) => p.category).length,
    pending: people.filter((p) => !p.category).length,
    skipped: people.filter((p) => !p.category && p.skipped).length,
  },
  window_days: 365,
  refreshed_at: "2026-10-22T11:00:00Z",
  errors: [],
});

const renderPage = () => render(<MemoryRouter><Contacts /></MemoryRouter>);

beforeEach(() => fetchMock.mockReset());
afterEach(() => cleanup());

it("prompts for the first pending contact, shows progress, and advances after assigning", async () => {
  const first = snapshot([person("a", "Alpha Tester"), person("b", "Beta Tester")]);
  const after = snapshot([
    person("a", "Alpha Tester", { category: categories[0] }),
    person("b", "Beta Tester"),
  ]);
  fetchMock
    .mockResolvedValueOnce(jsonResponse(first))
    .mockResolvedValueOnce(jsonResponse({ keys: ["a"], category: "family", progress: after.progress }))
    .mockResolvedValueOnce(jsonResponse(after));
  renderPage();

  expect(await screen.findByText("Contacts")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Contacts" }).nextElementSibling?.textContent).toContain(
    "0 of 2 categorized · messages in the last 365 days · WhatsApp · scanned",
  );
  expect(screen.getByText("2 to review")).toBeTruthy();
  const current = screen.getByTestId("review-current");
  expect(current.textContent).toContain("Alpha Tester");
  fireEvent.click(screen.getByRole("button", { name: "Family" }));

  await waitFor(() => expect(screen.getByTestId("review-current").textContent).toContain("Beta Tester"));
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/messaging-contacts/assign/", expect.objectContaining({
    method: "POST",
    body: JSON.stringify({ keys: ["a"], category: "family" }),
  }));
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
  expect(screen.getByText("1 to review")).toBeTruthy();
});

it("skips the current contact for now and offers to bring skipped ones back", async () => {
  const first = snapshot([person("a", "Alpha Tester")]);
  const after = snapshot([person("a", "Alpha Tester", { skipped: true, skipped_until: "2026-10-23T11:00:00Z" })]);
  fetchMock
    .mockResolvedValueOnce(jsonResponse(first))
    .mockResolvedValueOnce(jsonResponse({ keys: ["a"], skipped_until: after.people[0].skipped_until, progress: after.progress }))
    .mockResolvedValueOnce(jsonResponse(after));
  renderPage();

  fireEvent.click(await screen.findByRole("button", { name: "Skip for now" }));
  expect(await screen.findByText("Nothing left right now. Skipped contacts come back tomorrow.")).toBeTruthy();
  expect(screen.getByText("0 to review · 1 skipped")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Review skipped now" }));
  expect(screen.getByTestId("review-current").textContent).toContain("Alpha Tester");
});

it("skips several selected contacts at once", async () => {
  const people = [person("a", "Alpha Tester"), person("b", "Beta Tester"), person("c", "Gamma Tester")];
  fetchMock
    .mockResolvedValueOnce(jsonResponse(snapshot(people)))
    .mockResolvedValueOnce(jsonResponse({ keys: ["a", "b", "c"], skipped_until: "x", progress: { total: 3, categorized: 0, pending: 3, skipped: 3 } }))
    .mockResolvedValueOnce(jsonResponse(snapshot(people.map((p) => ({ ...p, skipped: true })))));
  renderPage();

  fireEvent.click(await screen.findByRole("checkbox", { name: "Select all pending contacts" }));
  expect(screen.getByText("3 selected")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Skip selected" }));
  await waitFor(() =>
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/messaging-contacts/skip/", expect.objectContaining({
      body: JSON.stringify({ keys: ["a", "b", "c"] }),
    })),
  );
});

it("celebrates when everyone is categorized and explains missing sources", async () => {
  fetchMock.mockResolvedValueOnce(jsonResponse(snapshot([person("a", "Alpha Tester", { category: categories[0] })])));
  renderPage();
  expect(await screen.findByText(/All contacts are categorized/)).toBeTruthy();
  expect(screen.getByText("Everyone is categorized")).toBeTruthy();
  cleanup();

  fetchMock.mockReset();
  fetchMock.mockResolvedValueOnce(jsonResponse({ ...snapshot([]), sources: [] }));
  renderPage();
  expect(await screen.findByText(/No messaging sources found/)).toBeTruthy();
});
