// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApprovalRequest } from "@/lib/approval-requests";
import { ApprovalCardStack } from "../ApprovalCardStack";

// jsdom may not ship PointerEvent; the component only reads MouseEvent fields.
beforeEach(() => {
  if (!("PointerEvent" in window)) {
    vi.stubGlobal("PointerEvent", MouseEvent);
  }
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const REQUESTS: ApprovalRequest[] = [
  {
    id: "1",
    method: "openbaseSkill/requestApproval",
    params: { description: "Send the launch email" },
    received_at: "2026-09-18T10:00:00Z",
  },
  {
    id: "2",
    method: "openbaseSkill/requestApproval",
    params: { description: "Delete the staging bucket" },
    received_at: "2026-09-18T11:00:00Z",
  },
];

function renderStack(
  onAnswer = vi.fn().mockResolvedValue(true),
  requests = REQUESTS,
) {
  const view = render(
    <MemoryRouter>
      <ApprovalCardStack requests={requests} acting={false} onAnswer={onAnswer} />
    </MemoryRouter>,
  );
  return { view, onAnswer };
}

describe("ApprovalCardStack", () => {
  it("shows the oldest request as the top card with a counter", () => {
    renderStack();
    const topCard = screen.getByTestId("approval-top-card");
    expect(topCard.textContent).toContain("Send the launch email");
    expect(screen.getByText(/1 of 2/).textContent).toContain(
      "swipe right to approve",
    );
  });

  it("approves the top card from the button", async () => {
    const { onAnswer } = renderStack();
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    expect(onAnswer).toHaveBeenCalledWith(REQUESTS[0], "accept");
    await act(async () => {});
  });

  it("declines the top card from the keyboard", async () => {
    const { onAnswer } = renderStack();
    fireEvent.keyDown(screen.getByRole("group"), { key: "ArrowLeft" });
    expect(onAnswer).toHaveBeenCalledWith(REQUESTS[0], "decline");
    await act(async () => {});
  });

  it("approves when swiped right past the threshold", async () => {
    const { onAnswer } = renderStack();
    const topCard = screen.getByTestId("approval-top-card");
    fireEvent.pointerDown(topCard, { pointerId: 1, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(topCard, { pointerId: 1, clientX: 300, clientY: 60 });
    fireEvent.pointerUp(topCard, { pointerId: 1, clientX: 300, clientY: 60 });
    expect(onAnswer).toHaveBeenCalledWith(REQUESTS[0], "accept");
    await act(async () => {});
  });

  it("declines when swiped left past the threshold", async () => {
    const { onAnswer } = renderStack();
    const topCard = screen.getByTestId("approval-top-card");
    fireEvent.pointerDown(topCard, { pointerId: 1, clientX: 300, clientY: 50 });
    fireEvent.pointerMove(topCard, { pointerId: 1, clientX: 100, clientY: 60 });
    fireEvent.pointerUp(topCard, { pointerId: 1, clientX: 100, clientY: 60 });
    expect(onAnswer).toHaveBeenCalledWith(REQUESTS[0], "decline");
    await act(async () => {});
  });

  it("snaps back without deciding on a short drag", () => {
    const { onAnswer } = renderStack();
    const topCard = screen.getByTestId("approval-top-card");
    fireEvent.pointerDown(topCard, { pointerId: 1, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(topCard, { pointerId: 1, clientX: 140, clientY: 55 });
    fireEvent.pointerUp(topCard, { pointerId: 1, clientX: 140, clientY: 55 });
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("returns the card to the stack when the decision fails", async () => {
    const onAnswer = vi.fn().mockResolvedValue(false);
    renderStack(onAnswer);
    fireEvent.click(screen.getByRole("button", { name: /deny/i }));
    await act(async () => {});
    const topCard = screen.getByTestId("approval-top-card");
    expect(topCard.textContent).toContain("Send the launch email");
    const approve = screen.getByRole("button", {
      name: /approve/i,
    }) as HTMLButtonElement;
    expect(approve.disabled).toBe(false);
  });
});
