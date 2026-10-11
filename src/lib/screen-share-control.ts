/**
 * Maps browser pointer, wheel and keyboard events to the companion's
 * `openbase.remote_control.input` payloads (shared with the phone apps).
 *
 * The phones drive a trackpad (relative moves); the console has a real
 * pointer over the video, so it sends `move_to` with the position as a
 * fraction of the shared display, then the click.
 */

export type RemoteControlInput = Record<string, string | number | string[]>;

export const SCREEN_SHARE_STOP_TYPE = "openbase.screen_share.stop";
export const REMOTE_CONTROL_STATUS_TYPE = "openbase.remote_control.status";
export const REMOTE_CONTROL_INPUT_TYPE = "openbase.remote_control.input";
export const REMOTE_CONTROL_SET_ENABLED_TYPE = "openbase.remote_control.set_enabled";

/** Normalized position (0..1) of a pointer event over the rendered video. */
export function normalizedVideoPosition(
  event: { clientX: number; clientY: number },
  video: { getBoundingClientRect(): DOMRect; videoWidth: number; videoHeight: number },
): { x: number; y: number } | null {
  const rect = video.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  // The video is letterboxed (object-fit: contain); map inside the frame.
  const aspect = video.videoWidth > 0 && video.videoHeight > 0
    ? video.videoWidth / video.videoHeight
    : rect.width / rect.height;
  let frameWidth = rect.width;
  let frameHeight = rect.width / aspect;
  if (frameHeight > rect.height) {
    frameHeight = rect.height;
    frameWidth = rect.height * aspect;
  }
  const left = rect.left + (rect.width - frameWidth) / 2;
  const top = rect.top + (rect.height - frameHeight) / 2;
  const x = (event.clientX - left) / frameWidth;
  const y = (event.clientY - top) / frameHeight;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { x, y };
}

export function clickInputs(
  position: { x: number; y: number },
  button: number,
): RemoteControlInput[] {
  const name = button === 2 ? "right" : button === 1 ? "middle" : "left";
  return [
    { action: "move_to", x: position.x, y: position.y },
    { action: "click", button: name },
  ];
}

export function scrollInput(deltaX: number, deltaY: number): RemoteControlInput {
  // Wheel deltas are pixels; the companion clamps and scales them.
  return { action: "scroll", deltaX: Math.round(deltaX), deltaY: Math.round(deltaY) };
}

const SPECIAL_KEYS: Record<string, string> = {
  Enter: "ENTER",
  Escape: "ESCAPE",
  Tab: "TAB",
  Backspace: "BACKSPACE",
  Delete: "BACKSPACE",
  ArrowLeft: "ARROWLEFT",
  ArrowRight: "ARROWRIGHT",
  ArrowUp: "ARROWUP",
  ArrowDown: "ARROWDOWN",
  Home: "HOME",
  End: "END",
  PageUp: "PAGEUP",
  PageDown: "PAGEDOWN",
  " ": "SPACE",
};

/**
 * One keyboard event → one input, or null for a bare modifier press.
 * Printable keys without modifiers are typed as text; everything else is a
 * keypress combo the companion understands (COMMAND, CONTROL, OPTION, SHIFT).
 */
export function keyInput(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): RemoteControlInput | null {
  const { key } = event;
  if (["Meta", "Control", "Alt", "Shift", "CapsLock", "Dead", "Unidentified"].includes(key)) {
    return null;
  }
  const modifiers = [
    event.metaKey ? "COMMAND" : null,
    event.ctrlKey ? "CONTROL" : null,
    event.altKey ? "OPTION" : null,
  ].filter((value): value is string => value !== null);
  const special = SPECIAL_KEYS[key];
  if (special) {
    return { action: "keypress", keys: [...modifiers, ...(event.shiftKey ? ["SHIFT"] : []), special] };
  }
  if (key.length === 1) {
    if (modifiers.length === 0) return { action: "type", text: key };
    return { action: "keypress", keys: [...modifiers, key.toUpperCase()] };
  }
  return null;
}
