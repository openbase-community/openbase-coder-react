// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { SkillSharingSettings } from "./SkillSharingSettings";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

const initial = {
  auto_link_personal_skills: false,
  sync_skills_across_devices: false,
  device_sync_enabled: true,
  warnings: [],
};
const response = (data = initial) => ({ ok: true, json: async () => data }) as Response;
const renderSettings = () => render(<MemoryRouter><SkillSharingSettings /></MemoryRouter>);

afterEach(() => { cleanup(); vi.resetAllMocks(); });

it("saves each independent toggle and explains that turning off preserves files", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(response())
    .mockResolvedValueOnce(response({ ...initial, auto_link_personal_skills: true }))
    .mockResolvedValueOnce(response({ ...initial, auto_link_personal_skills: true, sync_skills_across_devices: true }));
  renderSettings();
  const linking = await screen.findByRole("switch", { name: "Symlink my skills across backends (Codex/Claude Code)" });
  const syncing = screen.getByRole("switch", { name: "Sync my skills across devices" });
  expect(screen.getByText(/Turning this off leaves existing links in place/)).toBeTruthy();
  expect(screen.getByText(/keeps your files on every device/)).toBeTruthy();
  fireEvent.click(linking);
  await waitFor(() => expect(linking.getAttribute("aria-checked")).toBe("true"));
  expect(syncing.getAttribute("aria-checked")).toBe("false");
  expect(apiFetch).toHaveBeenLastCalledWith("/api/skills/settings/", {
    method: "PATCH", body: JSON.stringify({ auto_link_personal_skills: true }),
  });
  fireEvent.click(syncing);
  await waitFor(() => expect(syncing.getAttribute("aria-checked")).toBe("true"));
  expect(apiFetch).toHaveBeenLastCalledWith("/api/skills/settings/", {
    method: "PATCH", body: JSON.stringify({ sync_skills_across_devices: true }),
  });
});

it("keeps the saved value visible when an enable fails", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(response()).mockRejectedValueOnce(new Error("Add a second machine"));
  renderSettings();
  const syncing = await screen.findByRole("switch", { name: "Sync my skills across devices" });
  fireEvent.click(syncing);
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Add a second machine");
  expect(syncing.getAttribute("aria-checked")).toBe("false");
});

it("reports paused transport instead of implying that selected skills are syncing", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(response({ ...initial, sync_skills_across_devices: true, device_sync_enabled: false }));
  renderSettings();
  expect(await screen.findByRole("status")).toHaveProperty("textContent", expect.stringContaining("device sync is paused"));
});

it("focuses and scrolls to the skills panel when opened from the Skills shortcut", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(response());
  const scroll = vi.fn();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scroll });
  render(<MemoryRouter initialEntries={["/dashboard/settings?section=agents&focus=skills"]}><SkillSharingSettings /></MemoryRouter>);
  await screen.findByRole("switch", { name: "Sync my skills across devices" });
  expect(document.activeElement).toBe(screen.getByRole("region", { name: "Skill sharing settings" }));
  expect(scroll).toHaveBeenCalledWith({ block: "start" });
  delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
});
