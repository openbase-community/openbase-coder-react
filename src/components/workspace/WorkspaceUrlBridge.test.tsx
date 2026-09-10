// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { WorkspaceTabsProvider } from "@/contexts/workspace-tabs";
import { WorkspaceController } from "@/lib/workspace/WorkspaceController";
import { WorkspaceUrlBridge } from "./WorkspaceUrlBridge";

afterEach(cleanup);

function BrowserControls() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="url">{location.pathname}</output>
      <button onClick={() => navigate("/dashboard/projects")}>Projects</button>
      <button onClick={() => navigate(-1)}>Back</button>
    </>
  );
}

it("syncs focused URLs and browser history without creating or navigating other tabs", () => {
  const controller = new WorkspaceController();
  const first = controller.focused!.getId();
  render(
    <WorkspaceTabsProvider initialController={controller}>
      <MemoryRouter initialEntries={["/dashboard/threads"]}>
        <WorkspaceUrlBridge />
        <BrowserControls />
      </MemoryRouter>
    </WorkspaceTabsProvider>,
  );
  expect(controller.path).toBe("/dashboard/threads");
  act(() =>
    controller.openTab({ path: "/dashboard/reports", title: "Reports" }),
  );
  expect(screen.getByTestId("url").textContent).toBe("/dashboard/reports");
  fireEvent.click(screen.getByText("Projects"));
  expect(controller.path).toBe("/dashboard/projects");
  expect(controller.tabs[0].getConfig().path).toBe("/dashboard/threads");
  fireEvent.click(screen.getByText("Back"));
  expect(controller.path).toBe("/dashboard/reports");
  act(() => controller.focus(first));
  expect(screen.getByTestId("url").textContent).toBe("/dashboard/threads");
  expect(controller.tabs).toHaveLength(2);
});
