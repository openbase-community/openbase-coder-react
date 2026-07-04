import { describe, expect, it } from "vitest";
import { reportDetailKeyboardAction } from "../reportDetailKeyboard";

describe("reportDetailKeyboardAction", () => {
  it("closes report detail on Escape", () => {
    expect(
      reportDetailKeyboardAction({
        key: "Escape",
        hasPrevious: true,
        hasNext: true,
      }),
    ).toBe("close");
  });

  it("opens delete confirmation on Backspace or Delete", () => {
    expect(
      reportDetailKeyboardAction({
        key: "Backspace",
        hasPrevious: true,
        hasNext: true,
      }),
    ).toBe("delete");
    expect(
      reportDetailKeyboardAction({
        key: "Delete",
        hasPrevious: true,
        hasNext: true,
      }),
    ).toBe("delete");
  });

  it("navigates only when an adjacent report exists", () => {
    expect(
      reportDetailKeyboardAction({
        key: "ArrowLeft",
        hasPrevious: true,
        hasNext: false,
      }),
    ).toBe("previous");
    expect(
      reportDetailKeyboardAction({
        key: "ArrowRight",
        hasPrevious: false,
        hasNext: true,
      }),
    ).toBe("next");
    expect(
      reportDetailKeyboardAction({
        key: "ArrowLeft",
        hasPrevious: false,
        hasNext: true,
      }),
    ).toBeNull();
    expect(
      reportDetailKeyboardAction({
        key: "ArrowRight",
        hasPrevious: true,
        hasNext: false,
      }),
    ).toBeNull();
  });

  it("does not handle shortcuts from editing targets or nested dialogs", () => {
    expect(
      reportDetailKeyboardAction({
        key: "Backspace",
        hasPrevious: true,
        hasNext: true,
        editingTarget: true,
      }),
    ).toBeNull();
    expect(
      reportDetailKeyboardAction({
        key: "ArrowRight",
        hasPrevious: true,
        hasNext: true,
        blockedByDialog: true,
      }),
    ).toBeNull();
    expect(
      reportDetailKeyboardAction({
        key: "ArrowLeft",
        hasPrevious: true,
        hasNext: true,
        defaultPrevented: true,
      }),
    ).toBeNull();
  });
});
