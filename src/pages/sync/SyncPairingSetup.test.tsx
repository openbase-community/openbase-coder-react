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

const GB = 1024 * 1024 * 1024;
const laptopPreview = {
  hub_name: "mini",
  hub_host: "mini.net.example",
  folders: [
    { id: "projects-alpha", path: "~/Projects/alpha", files: 1200, bytes: 2 * GB, selected: true },
    { id: "projects-beta", path: "~/Projects/beta", files: 80, bytes: 40 * 1024 * 1024, selected: true },
  ],
  this_computer: {
    cloud_workspace: false,
    project_only_default: false,
    disk: { free_bytes: 400 * GB, total_bytes: 1000 * GB },
  },
  project_only: false,
};
const cloudPreview = {
  ...laptopPreview,
  folders: laptopPreview.folders.map((f) => ({ ...f, selected: false })),
  this_computer: {
    cloud_workspace: true,
    project_only_default: true,
    disk: { free_bytes: 1.5 * GB, total_bytes: 5 * GB },
  },
  project_only: true,
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
    .mockResolvedValueOnce(jsonResponse(laptopPreview))
    .mockResolvedValueOnce(jsonResponse({ role: "edge", hub_name: "mini" }));

  render(<SyncPairingSetup onChanged={onChanged} />);

  expect(await screen.findByText("mini")).toBeTruthy();
  expect(screen.getByText("always-on")).toBeTruthy();
  expect(screen.getByText("offline")).toBeTruthy();
  expect(screen.getByText("Offline or Openbase is not running.")).toBeTruthy();
  expect(screen.queryByText(/No always-on computer yet/)).toBeNull();

  fireEvent.click(screen.getByText("Sync with this"));
  expect(await screen.findByText("Which of mini's folders should this computer sync?")).toBeTruthy();
  expect(fetchMock.mock.calls[1][0]).toBe(
    "/api/sync/daemon/pairing/hub-folders/?hub=mini.net.example",
  );
  // a laptop: every folder preselected, sizes from the hub
  expect(screen.getByText("1,200 files · 2.0 GB")).toBeTruthy();
  fireEvent.click(screen.getByText("Sync all folders"));

  await waitFor(() => expect(onChanged).toHaveBeenCalled());
  const [url, init] = fetchMock.mock.calls[2];
  expect(url).toBe("/api/sync/daemon/pairing/join/");
  expect(init?.method).toBe("POST");
  expect(JSON.parse(String(init?.body))).toEqual({
    hub: "mini.net.example",
    roots: ["~/Projects/alpha", "~/Projects/beta"],
    project_only: false,
  });
  expect(toast.success).toHaveBeenCalledWith("Syncing with mini.");
});

it("shows the hub's error when joining fails", async () => {
  const onChanged = vi.fn();
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ signed_in: true, role: "none", candidates: [mini] }),
    )
    .mockResolvedValueOnce(jsonResponse(laptopPreview))
    .mockResolvedValueOnce(
      jsonResponse(
        { error: "Could not reach mini.", code: "hub_unreachable" },
        { status: 502 },
      ),
    );

  render(<SyncPairingSetup onChanged={onChanged} />);
  fireEvent.click(await screen.findByText("Sync with this"));
  fireEvent.click(await screen.findByText("Sync all folders"));

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

it("says when Openbase must restart to finish (Docker)", async () => {
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ signed_in: true, role: "none", candidates: [] }),
    )
    .mockResolvedValueOnce(
      jsonResponse({ role: "hub", roots: [], restart_required: true }),
    );

  render(<SyncPairingSetup onChanged={vi.fn()} />);
  await screen.findByText(/No always-on computer yet/);
  fireEvent.click(screen.getByText("Make this my always-on computer"));

  await waitFor(() =>
    expect(toast.success).toHaveBeenCalledWith(
      "This computer is now your always-on computer. Restart Openbase to finish.",
    ),
  );
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

it("on a cloud workspace, preselects nothing and joins project-only", async () => {
  const onChanged = vi.fn();
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ signed_in: true, role: "none", candidates: [mini] }),
    )
    .mockResolvedValueOnce(jsonResponse(cloudPreview))
    .mockResolvedValueOnce(jsonResponse({ role: "edge", hub_name: "mini" }));

  render(<SyncPairingSetup onChanged={onChanged} />);
  fireEvent.click(await screen.findByText("Sync with this"));

  expect(await screen.findByText(/This is a cloud workspace with a small disk/)).toBeTruthy();
  expect(screen.getByText("No folder chosen.", { exact: false })).toBeTruthy();
  const join = screen.getByText("Sync 0 folders").closest("button");
  expect(join?.disabled).toBe(true);

  // the 2 GB folder does not fit in 1.5 GB free: warned
  fireEvent.click(screen.getByLabelText("Sync ~/Projects/alpha"));
  expect(await screen.findByText(/That may not fit/)).toBeTruthy();
  fireEvent.click(screen.getByLabelText("Sync ~/Projects/alpha"));
  fireEvent.click(screen.getByLabelText("Sync ~/Projects/beta"));
  expect(screen.queryByText(/That may not fit/)).toBeNull();
  expect(screen.getByText(/About 40.0 MB to sync · this computer: 1.5 GB free of 5.0 GB/)).toBeTruthy();
  fireEvent.click(screen.getByText("Sync 1 folder"));

  await waitFor(() => expect(onChanged).toHaveBeenCalled());
  expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({
    hub: "mini.net.example",
    roots: ["~/Projects/beta"],
    project_only: true,
  });
});

it("shows why the hub's folders could not be listed, and goes back", async () => {
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ signed_in: true, role: "none", candidates: [mini] }),
    )
    .mockResolvedValueOnce(
      jsonResponse({ error: "Could not reach mini.", code: "hub_unreachable" }, { status: 502 }),
    );

  render(<SyncPairingSetup onChanged={vi.fn()} />);
  fireEvent.click(await screen.findByText("Sync with this"));

  expect(await screen.findByText("Could not reach mini.")).toBeTruthy();
  fireEvent.click(screen.getByText("Back"));
  expect(screen.queryByText("Could not reach mini.")).toBeNull();
});

it("chooses one project inside a folder the hub syncs whole", async () => {
  const onChanged = vi.fn();
  const preview = {
    ...cloudPreview,
    folders: [
      {
        id: "projects",
        path: "~/Projects",
        files: 900_000,
        bytes: 80 * GB,
        selected: false,
        subfolders: [
          { name: "app", path: "~/Projects/app", files: 300, bytes: 90 * 1024 * 1024, selected: false },
          { name: "site", path: "~/Projects/site", files: 40, bytes: 2 * 1024 * 1024, selected: false },
        ],
      },
    ],
  };
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ signed_in: true, role: "none", candidates: [mini] }))
    .mockResolvedValueOnce(jsonResponse(preview))
    .mockResolvedValueOnce(jsonResponse({ role: "edge", hub_name: "mini" }));

  render(<SyncPairingSetup onChanged={onChanged} />);
  fireEvent.click(await screen.findByText("Sync with this"));

  expect(await screen.findByText("300 files · 90.0 MB")).toBeTruthy();
  fireEvent.click(screen.getByLabelText("Sync ~/Projects/app"));
  expect(screen.getByText(/About 90.0 MB to sync/)).toBeTruthy();
  // choosing the whole folder hides its projects (it covers them)
  fireEvent.click(screen.getByLabelText("Sync ~/Projects"));
  expect(screen.queryByLabelText("Sync ~/Projects/site")).toBeNull();
  expect(await screen.findByText(/That may not fit/)).toBeTruthy();
  fireEvent.click(screen.getByLabelText("Sync ~/Projects"));
  fireEvent.click(screen.getByText("Sync 1 folder"));

  await waitFor(() => expect(onChanged).toHaveBeenCalled());
  expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({
    hub: "mini.net.example",
    roots: ["~/Projects/app"],
    project_only: true,
  });
});
