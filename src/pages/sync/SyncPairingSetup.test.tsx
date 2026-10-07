// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { SyncPairingSetup } from "./SyncPairingSetup";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const fetchMock = vi.mocked(apiFetch);

const jsonResponse = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

const mini = {
  id: "mini.net.example",
  name: "mini",
  host: "mini.net.example",
  reachable: true,
  role: "hub",
};
const desk = {
  id: "desk.net.example",
  name: "desk",
  host: "desk.net.example",
  reachable: false,
  role: "unknown",
  error: "Offline or Openbase is not running.",
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.mocked(toast.error).mockReset();
  vi.mocked(toast.success).mockReset();
});

afterEach(() => {
  cleanup();
});

it("shows a neutral state with no other computers", async () => {
  fetchMock.mockResolvedValueOnce(
    jsonResponse({ signed_in: true, role: "none", candidates: [] }),
  );

  render(<SyncPairingSetup onChanged={vi.fn()} />);

  expect(
    screen.getByText(
      "This computer is not syncing. Add an always-on computer to sync.",
    ),
  ).toBeTruthy();
  expect(await screen.findByText(/No always-on computer yet/)).toBeTruthy();
  expect(screen.getByText("Make this my always-on computer")).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("lists computers with their role and joins a hub", async () => {
  const onChanged = vi.fn();
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ signed_in: true, role: "none", candidates: [mini, desk] }),
    )
    .mockResolvedValueOnce(jsonResponse({ role: "edge", hub_name: "mini" }));

  render(<SyncPairingSetup onChanged={onChanged} />);

  expect(await screen.findByText("mini")).toBeTruthy();
  expect(screen.getByText("always-on")).toBeTruthy();
  expect(screen.getByText("offline")).toBeTruthy();
  expect(screen.getByText("Offline or Openbase is not running.")).toBeTruthy();
  expect(screen.queryByText(/No always-on computer yet/)).toBeNull();

  fireEvent.click(screen.getByText("Sync with this"));

  await waitFor(() => expect(onChanged).toHaveBeenCalled());
  const [url, init] = fetchMock.mock.calls[1];
  expect(url).toBe("/api/sync/daemon/pairing/join/");
  expect(init?.method).toBe("POST");
  expect(JSON.parse(String(init?.body))).toEqual({ hub: "mini.net.example" });
  expect(toast.success).toHaveBeenCalledWith("Syncing with mini.");
});

it("shows the hub's error when joining fails", async () => {
  const onChanged = vi.fn();
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ signed_in: true, role: "none", candidates: [mini] }),
    )
    .mockResolvedValueOnce(
      jsonResponse(
        { error: "Could not reach mini.", code: "hub_unreachable" },
        { status: 502 },
      ),
    );

  render(<SyncPairingSetup onChanged={onChanged} />);
  fireEvent.click(await screen.findByText("Sync with this"));

  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith("Could not reach mini."),
  );
  expect(onChanged).not.toHaveBeenCalled();
});

it("makes this computer the hub", async () => {
  const onChanged = vi.fn();
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ signed_in: true, role: "none", candidates: [] }),
    )
    .mockResolvedValueOnce(jsonResponse({ role: "hub", roots: [] }));

  render(<SyncPairingSetup onChanged={onChanged} />);
  await screen.findByText(/No always-on computer yet/);
  fireEvent.click(screen.getByText("Make this my always-on computer"));

  await waitFor(() => expect(onChanged).toHaveBeenCalled());
  expect(fetchMock.mock.calls[1][0]).toBe("/api/sync/daemon/pairing/hub/");
  expect(fetchMock.mock.calls[1][1]?.method).toBe("POST");
});

it("asks to sign in when this computer is signed out", async () => {
  fetchMock.mockResolvedValueOnce(
    jsonResponse({ signed_in: false, role: "none", candidates: [] }),
  );

  render(<SyncPairingSetup onChanged={vi.fn()} />);

  expect(
    await screen.findByText("Sign in to Openbase to see your other computers."),
  ).toBeTruthy();
  expect(
    screen.getByText("Make this my always-on computer").closest("button")?.disabled,
  ).toBe(true);
});
