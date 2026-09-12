// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { BoilerSyncTemplatesResponse } from "@/lib/boilersync";
import BoilerSync from "./BoilerSync";

const apiMocks = vi.hoisted(() => ({
  add: vi.fn(),
  dismiss: vi.fn(),
  fetch: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/boilersync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/boilersync")>()),
  addBoilerSyncSource: apiMocks.add,
  fetchBoilerSyncTemplates: apiMocks.fetch,
  removeBoilerSyncSource: apiMocks.remove,
  setBoilerSyncFeaturedPromptDismissed: apiMocks.dismiss,
}));

vi.mock("@/components/layouts/DashboardLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const response = (
  overrides: Partial<BoilerSyncTemplatesResponse> = {},
): BoilerSyncTemplatesResponse => ({
  boilersync_available: true,
  boilersync_path: "/bin/boilersync",
  details: null,
  error: null,
  featured_source: {
    installed: false,
    org: "openbase-community",
    prompt_dismissed: false,
    prompt_visible: true,
    repo: "templates",
    repo_url: "https://github.com/openbase-community/templates.git",
  },
  sources: { sources: [], template_root_dir: "/template-cache" },
  templates: { templates: [], template_root_dir: "/template-cache" },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  apiMocks.fetch.mockResolvedValue(response());
});

afterEach(cleanup);

it("dismisses the featured suggestion while keeping repository import available", async () => {
  apiMocks.dismiss.mockResolvedValue(
    response({
      featured_source: {
        ...response().featured_source,
        prompt_dismissed: true,
        prompt_visible: false,
      },
    }),
  );
  render(<BoilerSync />);

  expect(await screen.findByText("Openbase community templates")).toBeTruthy();
  expect(screen.getByLabelText("Template repository URL")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Not now" }));

  await waitFor(() => expect(apiMocks.dismiss).toHaveBeenCalledWith(true));
  await waitFor(() =>
    expect(screen.queryByText("Openbase community templates")).toBeNull(),
  );
  expect(screen.getByLabelText("Template repository URL")).toBeTruthy();
});

it("imports the featured source as an explicit opt-in", async () => {
  apiMocks.add.mockResolvedValue(
    response({
      featured_source: {
        ...response().featured_source,
        installed: true,
        prompt_dismissed: true,
        prompt_visible: false,
      },
    }),
  );
  render(<BoilerSync />);

  fireEvent.click(
    await screen.findByRole("button", { name: "Import templates" }),
  );

  await waitFor(() =>
    expect(apiMocks.add).toHaveBeenCalledWith(
      "https://github.com/openbase-community/templates.git",
      { dismissFeaturedPrompt: true },
    ),
  );
  await waitFor(() =>
    expect(screen.queryByText("Openbase community templates")).toBeNull(),
  );
});

it("adds a user-provided template repository URL", async () => {
  apiMocks.add.mockResolvedValue(response());
  render(<BoilerSync />);

  const input = await screen.findByLabelText("Template repository URL");
  fireEvent.change(input, {
    target: { value: "https://github.com/example/templates.git" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add repository" }));

  await waitFor(() =>
    expect(apiMocks.add).toHaveBeenCalledWith(
      "https://github.com/example/templates.git",
      {},
    ),
  );
});

it("removes an imported repository after confirmation", async () => {
  const source = {
    branch: "main",
    commit: "abc1234",
    org: "example",
    path: "/template-cache/example/templates",
    remote_url: "https://github.com/example/templates.git",
    repo: "templates",
    template_count: 2,
  };
  apiMocks.fetch.mockResolvedValue(
    response({ sources: { sources: [source] } }),
  );
  apiMocks.remove.mockResolvedValue(response());
  render(<BoilerSync />);

  fireEvent.click(
    await screen.findByRole("button", { name: "Remove example/templates" }),
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Remove repository" }),
  );

  await waitFor(() =>
    expect(apiMocks.remove).toHaveBeenCalledWith("example", "templates"),
  );
});
