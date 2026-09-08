// Pure-renderer find-in-page: highlights matches with the CSS Custom
// Highlight API (no DOM mutation) so it works identically in the Electron
// shell and the web console. The search scope is chosen by the caller, which
// is how the find bar avoids matching its own query input.

export const FIND_HIGHLIGHT_NAME = "ob-find";
export const FIND_ACTIVE_HIGHLIGHT_NAME = "ob-find-active";

// Pages that opt in to the Cmd/Ctrl+F find bar, by route prefix. Detail
// routes nested under a prefix (e.g. /dashboard/threads/:threadId) are
// covered by their list prefix. To enable find on another page, add its
// route prefix here — nothing else is required.
const FIND_IN_PAGE_ROUTE_PREFIXES = [
  "/dashboard/threads",
  "/dashboard/reports",
  "/dashboard/approvals",
  "/dashboard/skills",
];

export function findInPageEnabledForPath(pathname: string): boolean {
  return FIND_IN_PAGE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function findInPageSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { Highlight?: unknown }).Highlight ===
      "function" &&
    typeof CSS !== "undefined" &&
    "highlights" in CSS
  );
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"]);

function isVisible(element: Element): boolean {
  const htmlElement = element as HTMLElement;
  if (htmlElement.offsetParent !== null) {
    return true;
  }
  // offsetParent is null for position:fixed subtrees even when visible, so
  // fall back to client rects.
  return element.getClientRects().length > 0;
}

/**
 * Collect DOM Ranges for every occurrence of `query` within `root`, in
 * document order. Case-insensitive. Text nodes inside an element marked
 * `data-find-ignore` (the find bar itself), inside skipped tags, or not
 * currently rendered are excluded. Matches that span multiple text nodes
 * (query broken across inline elements) are not found — an accepted limit of
 * text-node scanning.
 */
export function collectMatchRanges(root: Node, query: string): Range[] {
  if (!query) {
    return [];
  }
  const needle = query.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) {
        return NodeFilter.FILTER_REJECT;
      }
      if (SKIP_TAGS.has(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (parent.closest("[data-find-ignore]")) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!node.nodeValue || !node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!isVisible(parent)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const ranges: Range[] = [];
  let current = walker.nextNode();
  while (current) {
    const haystack = (current.nodeValue ?? "").toLowerCase();
    let from = 0;
    for (;;) {
      const index = haystack.indexOf(needle, from);
      if (index === -1) {
        break;
      }
      const range = document.createRange();
      range.setStart(current, index);
      range.setEnd(current, index + needle.length);
      ranges.push(range);
      from = index + needle.length;
    }
    current = walker.nextNode();
  }
  return ranges;
}

type HighlightConstructor = new (...ranges: Range[]) => object;

export function applyHighlights(
  ranges: Range[],
  activeIndex: number,
): void {
  if (!findInPageSupported()) {
    return;
  }
  const HighlightCtor = (window as unknown as { Highlight: HighlightConstructor })
    .Highlight;
  const inactive = ranges.filter((_, index) => index !== activeIndex);
  CSS.highlights.set(
    FIND_HIGHLIGHT_NAME,
    new HighlightCtor(...inactive) as Highlight,
  );
  const active = ranges[activeIndex];
  if (active) {
    CSS.highlights.set(
      FIND_ACTIVE_HIGHLIGHT_NAME,
      new HighlightCtor(active) as Highlight,
    );
  } else {
    CSS.highlights.delete(FIND_ACTIVE_HIGHLIGHT_NAME);
  }
}

export function clearHighlights(): void {
  if (!findInPageSupported()) {
    return;
  }
  CSS.highlights.delete(FIND_HIGHLIGHT_NAME);
  CSS.highlights.delete(FIND_ACTIVE_HIGHLIGHT_NAME);
}

export function scrollRangeIntoView(range: Range): void {
  const target =
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element)
      : range.startContainer.parentElement;
  target?.scrollIntoView({ block: "center", inline: "nearest" });
}
