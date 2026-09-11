// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApprovalRequestParameters } from "../ApprovalRequestParameters";

describe("ApprovalRequestParameters", () => {
  it("renders structured fields without a raw JSON dump", () => {
    render(
      <ApprovalRequestParameters
        params={{
          source: "skill",
          description: "Send a message",
          command: 'whatsapp-local send contact "[message text redacted]"',
          justification: "contact_name: Example Contact; message: First line Second line",
          details: {
            contact_name: "Example Contact",
            message: "First line\nSecond line",
          },
        }}
      />,
    );

    expect(screen.getByText("Details")).toBeTruthy();
    expect(screen.getByText("Contact name")).toBeTruthy();
    expect(screen.getByText("Example Contact")).toBeTruthy();
    expect(screen.getByText("Message")).toBeTruthy();
    const message = screen.getByText(
      (_, element) =>
        element?.tagName === "SPAN" && element.textContent === "First line\nSecond line",
    );
    expect(message.className).toContain("whitespace-pre-wrap");
    expect(screen.getByText("Command")).toBeTruthy();
    expect(screen.queryByText("Justification")).toBeNull();
    expect(screen.queryByText(/\"contact_name\"/)).toBeNull();
    expect(screen.queryByText("Source")).toBeNull();
  });
});
