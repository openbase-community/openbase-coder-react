/**
 * Compact, human-relative timestamps for the chat transcript ("just now",
 * "4m ago", "3h ago", "2d ago"). Falls back to a locale date once an event is
 * more than a few weeks old. The absolute time is meant to live in a `title`
 * tooltip at the call site.
 */
export function relativeTimeShort(
  value: string | number | null | undefined,
  now: Date = new Date(),
): string {
  if (value == null) return "";
  const then = typeof value === "number" ? value : Date.parse(value);
  if (Number.isNaN(then)) return "";
  const sec = Math.round((now.getTime() - then) / 1000);
  if (sec < 0) return "just now";
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk}w ago`;
  return new Date(then).toLocaleDateString();
}
