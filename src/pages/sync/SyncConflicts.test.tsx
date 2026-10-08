// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SyncConflicts } from "./SyncConflicts";
import type { SyncDaemonConflict } from "./syncTypes";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(cleanup);

const conflict = (
  id: number,
  path: string,
  kind: string,
  group: string,
): SyncDaemonConflict => ({
  id,
  root: "projects",
  path,
  kind,
  a_hash: "a".repeat(64),
  b_hash: "b".repeat(64),
  a_device: "laptop",
  b_device: "mini",
  created_ns: 1,
  group,
});

it("falls back to all kinds once the filtered kind is gone", () => {
  const file = conflict(1, "app/a.txt", "content", "app");
  const branch = conflict(2, "app:refs/heads/main", "git-branch", "app");
  const props = { otherName: (d: string) => d, onChanged: () => {} };
  const { rerender } = render(
    <SyncConflicts conflicts={[file, branch]} {...props} />,
  );
  fireEvent.change(screen.getByLabelText("Conflict kind"), {
    target: { value: "content" },
  });
  expect(screen.getByText("a.txt")).toBeTruthy();
  expect(screen.queryByText("branch main")).toBeNull();

  rerender(<SyncConflicts conflicts={[branch]} {...props} />);

  expect(screen.getByText("branch main")).toBeTruthy();
  expect(screen.queryByText("No conflicts match this filter.")).toBeNull();
});

it("labels the choices of a deletion conflict by what they do", () => {
  render(
    <SyncConflicts
      conflicts={[{ ...conflict(3, "notes/x.md", "delete-edit", "notes"), a_hash: "" }]}
      otherName={(d) => d}
      onChanged={() => {}}
    />,
  );
  expect(screen.getByText("Keep it deleted")).toBeTruthy();
  expect(screen.getByText("Restore mini's version")).toBeTruthy();
});
