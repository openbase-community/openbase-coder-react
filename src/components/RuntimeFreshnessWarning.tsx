import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { RuntimeFreshness } from "@/lib/runtime-freshness";
import { AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function RuntimeFreshnessWarning({ freshness }: { freshness: RuntimeFreshness | null }) {
  if (!freshness?.enabled || freshness.components.every((item) => item.state === "current")) return null;
  return <FreshnessPopover freshness={freshness} />;
}

function FreshnessPopover({ freshness }: { freshness: RuntimeFreshness }) {
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const affected = freshness.components.filter((item) => item.state !== "current");
  const stale = affected.filter((item) => item.state === "stale").length;
  const unknown = affected.length - stale;
  const summary = stale
    ? `Development code changed — ${stale} component${stale === 1 ? "" : "s"} need${stale === 1 ? "s" : ""} refreshing.`
    : `Cannot verify ${unknown} running component${unknown === 1 ? "" : "s"}.`;

  const keepOpen = () => clearTimeout(closeTimer.current);
  const closeAfterHover = () => {
    keepOpen();
    if (!pinned.current) closeTimer.current = setTimeout(() => setOpen(false), 200);
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  return (
    <Popover open={open} onOpenChange={(next) => {
      keepOpen();
      pinned.current = false;
      setOpen(next);
    }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-7 w-full min-w-0 items-center gap-2 overflow-hidden rounded border border-warning/40 bg-warning/10 px-3 text-left text-[12px] text-warning"
          onMouseEnter={() => { keepOpen(); setOpen(true); }}
          onMouseLeave={closeAfterHover}
          onClick={(event) => {
            // Clicking/tapping pins the hover preview for scrolling or copying.
            event.preventDefault();
            keepOpen();
            pinned.current = true;
            setOpen(true);
          }}
        >
          <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span role="status" className="min-w-0 flex-1 truncate">{summary}{stale > 0 && unknown > 0 ? ` ${unknown} also unverified.` : ""}</span>
          <span className="shrink-0 whitespace-nowrap underline underline-offset-2">Details</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-[min(60vh,420px)] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto text-xs"
        aria-label="Runtime freshness details"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={keepOpen}
        onMouseLeave={closeAfterHover}
      >
        <p className="font-semibold">Runtime freshness</p>
        <ul className="mt-3 space-y-3">
          {affected.map((item) => (
            <li key={item.component}>
              <strong>{item.component}</strong>: {item.reason}{" "}
              <span className="text-muted-foreground">{item.action}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-muted-foreground">{freshness.coverage} Refresh manually when your calls and coding sessions can be interrupted.</p>
      </PopoverContent>
    </Popover>
  );
}
