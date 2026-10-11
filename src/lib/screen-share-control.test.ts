import { describe, expect, it } from "vitest";
import {
  clickInputs,
  keyInput,
  normalizedVideoPosition,
  scrollInput,
} from "./screen-share-control";

const video = (rect: Partial<DOMRect>, videoWidth = 1920, videoHeight = 1080) => ({
  getBoundingClientRect: () =>
    ({ left: 0, top: 0, width: 800, height: 600, ...rect }) as DOMRect,
  videoWidth,
  videoHeight,
});

describe("normalizedVideoPosition", () => {
  it("maps inside the letterboxed frame of a 16:9 video in a 4:3 box", () => {
    // 800 wide → frame 800x450, centred with 75px bars top and bottom.
    const position = normalizedVideoPosition({ clientX: 400, clientY: 300 }, video({}));
    expect(position).toEqual({ x: 0.5, y: 0.5 });
    expect(normalizedVideoPosition({ clientX: 0, clientY: 75 }, video({}))).toEqual({ x: 0, y: 0 });
  });

  it("ignores clicks on the letterbox bars", () => {
    expect(normalizedVideoPosition({ clientX: 400, clientY: 10 }, video({}))).toBeNull();
  });
});

describe("clickInputs", () => {
  it("moves to the position, then clicks with the right button", () => {
    expect(clickInputs({ x: 0.25, y: 0.75 }, 2)).toEqual([
      { action: "move_to", x: 0.25, y: 0.75 },
      { action: "click", button: "right" },
    ]);
  });
});

describe("keyInput", () => {
  it("types printable keys and sends combos for modified keys", () => {
    expect(keyInput({ key: "a", metaKey: false, ctrlKey: false, altKey: false, shiftKey: false }))
      .toEqual({ action: "type", text: "a" });
    expect(keyInput({ key: "a", metaKey: true, ctrlKey: false, altKey: false, shiftKey: false }))
      .toEqual({ action: "keypress", keys: ["COMMAND", "A"] });
    expect(keyInput({ key: "Enter", metaKey: false, ctrlKey: false, altKey: false, shiftKey: true }))
      .toEqual({ action: "keypress", keys: ["SHIFT", "ENTER"] });
    expect(keyInput({ key: "Shift", metaKey: false, ctrlKey: false, altKey: false, shiftKey: true }))
      .toBeNull();
  });
});

describe("scrollInput", () => {
  it("rounds wheel deltas", () => {
    expect(scrollInput(1.4, -120.6)).toEqual({ action: "scroll", deltaX: 1, deltaY: -121 });
  });
});
