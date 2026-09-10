import { Input } from "@/components/ui/input";
import {
  applyHighlights,
  clearHighlights,
  collectMatchRanges,
  findInPageEnabledForPath,
  findInPageSupported,
  scrollRangeIntoView,
} from "@/lib/find-in-page";
import { getRuntimeShell } from "@/lib/runtime-config";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const navButtonClass =
  "rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Where matches are searched. The find bar lives outside this element (and is
// additionally marked data-find-ignore), so the query input never matches
// itself.
const SEARCH_ROOT_ID = "openbase-main";

function getSearchRoot(): Node {
  return document.querySelector('[data-workspace-panel][data-focused="true"]') ?? document.getElementById(SEARCH_ROOT_ID) ?? document.body;
}

/**
 * Cmd/Ctrl+F find bar for list/detail dashboard pages. Highlights matches in
 * the page content with the CSS Custom Highlight API — no DOM mutation. Only
 * mounted in the Electron desktop shell; the web console relies on the
 * browser's own Cmd+F. Gated further to the routes in findInPageEnabledForPath
 * (settings and other pages are excluded). Adding a page is a one-line change
 * in lib/find-in-page.ts.
 */
const FindInPageBar: React.FC = () => {
  const location = useLocation();
  const enabled =
    getRuntimeShell() === "electron" &&
    findInPageSupported() &&
    findInPageEnabledForPath(location.pathname);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rangesRef = useRef<Range[]>([]);

  const renderMatches = useCallback((nextActive: number) => {
    const ranges = rangesRef.current;
    const clamped =
      ranges.length === 0
        ? 0
        : ((nextActive % ranges.length) + ranges.length) % ranges.length;
    applyHighlights(ranges, clamped);
    setActiveIndex(clamped);
    const active = ranges[clamped];
    if (active) {
      scrollRangeIntoView(active);
    }
  }, []);

  const runSearch = useCallback(
    (value: string, preferredActive = 0) => {
      const ranges = value ? collectMatchRanges(getSearchRoot(), value) : [];
      rangesRef.current = ranges;
      setTotal(ranges.length);
      renderMatches(ranges.length ? preferredActive : 0);
    },
    [renderMatches],
  );

  const move = useCallback(
    (forward: boolean) => {
      if (rangesRef.current.length === 0) {
        return;
      }
      renderMatches(activeIndex + (forward ? 1 : -1));
    },
    [activeIndex, renderMatches],
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setTotal(0);
    setActiveIndex(0);
    rangesRef.current = [];
    clearHighlights();
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    runSearch(value);
  };

  // Cmd/Ctrl+F opens; while open, Cmd/Ctrl+G steps and Escape closes.
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && !event.altKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setOpen(true);
        inputRef.current?.select();
        inputRef.current?.focus();
        return;
      }
      if (!open) {
        return;
      }
      if (modifier && !event.altKey && event.key.toLowerCase() === "g") {
        event.preventDefault();
        move(!event.shiftKey);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, open, move, close]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  // A route change swaps the page content; reset find state so each page
  // starts fresh (matching native browser navigation) and no ranges from the
  // previous page linger.
  useEffect(() => {
    close();
  }, [location.pathname, close]);

  // Lists lazily load more rows as the user scrolls; re-scan (preserving the
  // active match's position where possible) when the searched content changes.
  useEffect(() => {
    if (!open || !query) {
      return;
    }
    const root = getSearchRoot();
    let frame = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => runSearch(query, activeIndex));
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [open, query, activeIndex, runSearch]);

  // Navigating away from an enabled page must not leave highlights behind.
  useEffect(() => {
    if (open && !enabled) {
      close();
    }
  }, [open, enabled, close]);
  useEffect(() => () => clearHighlights(), []);

  if (!enabled || !open) {
    return null;
  }

  return (
    <div
      role="search"
      aria-label="Find in page"
      data-find-ignore
      className="fixed right-4 top-14 z-50 flex items-center gap-1 rounded-lg border border-border bg-background p-1.5 shadow-lg"
    >
      <Input
        ref={inputRef}
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            move(!event.shiftKey);
          }
        }}
        placeholder="Find in page"
        aria-label="Find text"
        className="h-7 w-52 border-none text-sm shadow-none focus-visible:ring-1 focus-visible:ring-offset-0"
      />
      <span className="min-w-10 px-1 text-center text-xs tabular-nums text-muted-foreground">
        {query ? `${total === 0 ? 0 : activeIndex + 1}/${total}` : ""}
      </span>
      <button
        type="button"
        aria-label="Previous match"
        disabled={total === 0}
        onClick={() => move(false)}
        className={navButtonClass}
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Next match"
        disabled={total === 0}
        onClick={() => move(true)}
        className={navButtonClass}
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Close find bar"
        onClick={close}
        className={navButtonClass}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default FindInPageBar;
