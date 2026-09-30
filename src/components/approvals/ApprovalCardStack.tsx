import { ApprovalRequestSummary } from "@/components/approvals/ApprovalRequestSummary";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  approvalRequestKey,
  type ApprovalRequest,
} from "@/lib/approval-requests";
import { Check, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type SwipeDirection = 1 | -1;

type ApprovalCardStackProps = {
  /** Pending requests, oldest first; the oldest is the top card. */
  requests: ApprovalRequest[];
  /** True while a decision is being submitted; input is disabled. */
  acting: boolean;
  /** Resolves true when the decision was accepted by the backend. */
  onAnswer: (
    request: ApprovalRequest,
    decision: "accept" | "decline",
  ) => Promise<boolean>;
};

const EXIT_ANIMATION_MS = 250;
// Cards behind the top card shown as a stacked peek.
const PEEK_COUNT = 2;

export function ApprovalCardStack({
  requests,
  acting,
  onAnswer,
}: ApprovalCardStackProps) {
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [exiting, setExiting] = useState<{
    request: ApprovalRequest;
    direction: SwipeDirection;
    from: { dx: number; dy: number };
  } | null>(null);
  // The exit card mounts at its release position, then flies off on the next
  // frame so the CSS transition has a start state.
  const [exitFlown, setExitFlown] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const exitTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!exiting) {
      setExitFlown(false);
      return;
    }
    const raf = window.requestAnimationFrame(() => setExitFlown(true));
    return () => window.cancelAnimationFrame(raf);
  }, [exiting]);

  useEffect(
    () => () => {
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    },
    [],
  );

  const exitingKey = exiting ? approvalRequestKey(exiting.request) : null;
  const stack = exitingKey
    ? requests.filter((item) => approvalRequestKey(item) !== exitingKey)
    : requests;
  const topRequest: ApprovalRequest | undefined = stack[0];

  const decide = useCallback(
    (
      request: ApprovalRequest,
      direction: SwipeDirection,
      from: { dx: number; dy: number } = { dx: 0, dy: 0 },
    ) => {
      if (acting) return;
      setDrag(null);
      setExiting({ request, direction, from });
      void onAnswer(request, direction === 1 ? "accept" : "decline").then(
        (ok) => {
          if (!ok) {
            // The request is still pending; snap the card back into the stack.
            setExiting(null);
            return;
          }
          if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
          exitTimer.current = window.setTimeout(
            () => setExiting(null),
            EXIT_ANIMATION_MS,
          );
        },
      );
    },
    [acting, onAnswer],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (acting || exiting || !topRequest) return;
    // Let links and buttons inside the card receive plain clicks.
    if ((event.target as HTMLElement).closest("a, button")) return;
    pointerStart.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // jsdom and older browsers: dragging still works without capture.
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    if (!start || start.id !== event.pointerId) return;
    setDrag({ dx: event.clientX - start.x, dy: event.clientY - start.y });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    if (!start || start.id !== event.pointerId) return;
    pointerStart.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const width = cardRef.current?.offsetWidth || 320;
    const threshold = Math.min(width * 0.45, 160);
    if (topRequest && Math.abs(dx) >= threshold) {
      decide(topRequest, dx > 0 ? 1 : -1, { dx, dy });
    } else {
      setDrag(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!topRequest || acting || exiting) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      decide(topRequest, 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      decide(topRequest, -1);
    }
  };

  const width = cardRef.current?.offsetWidth ?? 320;
  const threshold = Math.min(width * 0.45, 160);
  const stampOpacity = drag ? Math.min(Math.abs(drag.dx) / threshold, 1) : 0;

  const renderCardBody = (request: ApprovalRequest) => (
    <div className="p-4">
      <ApprovalRequestSummary request={request} />
    </div>
  );

  return (
    <div
      className="mx-auto w-full max-w-xl outline-none"
      role="group"
      aria-label="Approval review cards"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="relative" style={{ paddingBottom: PEEK_COUNT * 10 }}>
        {stack.slice(1, 1 + PEEK_COUNT).map((request, idx) => (
          <Panel
            key={approvalRequestKey(request)}
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden shadow-sm"
            style={{
              transform: `translateY(${(idx + 1) * 10}px) scale(${1 - (idx + 1) * 0.04})`,
              zIndex: PEEK_COUNT - idx,
            }}
          >
            {renderCardBody(request)}
          </Panel>
        ))}

        {exiting ? (
          <Panel
            aria-hidden
            className="pointer-events-none absolute inset-0 shadow-md"
            style={{
              zIndex: PEEK_COUNT + 2,
              transform: exitFlown
                ? `translateX(${exiting.direction * 130}%) rotate(${exiting.direction * 18}deg)`
                : `translate(${exiting.from.dx}px, ${exiting.from.dy * 0.3}px) rotate(${exiting.from.dx * 0.05}deg)`,
              opacity: exitFlown ? 0 : 1,
              transition: `transform ${EXIT_ANIMATION_MS}ms ease-in, opacity ${EXIT_ANIMATION_MS}ms ease-in`,
            }}
          >
            {renderCardBody(exiting.request)}
          </Panel>
        ) : null}

        {topRequest ? (
          <Panel
            ref={cardRef}
            data-testid="approval-top-card"
            className="relative shadow-md"
            style={{
              zIndex: PEEK_COUNT + 1,
              touchAction: "pan-y",
              cursor: drag ? "grabbing" : "grab",
              transform: drag
                ? `translate(${drag.dx}px, ${drag.dy * 0.3}px) rotate(${drag.dx * 0.05}deg)`
                : undefined,
              transition: drag ? "none" : "transform 200ms ease",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={() => {
              pointerStart.current = null;
              setDrag(null);
            }}
          >
            <span
              className="pointer-events-none absolute left-3 top-3 rounded border-2 border-success px-2 py-0.5 text-[13px] font-bold uppercase tracking-wider text-success"
              style={{
                opacity: drag && drag.dx > 0 ? stampOpacity : 0,
                transform: "rotate(-12deg)",
              }}
            >
              Approve
            </span>
            <span
              className="pointer-events-none absolute right-3 top-3 rounded border-2 border-destructive px-2 py-0.5 text-[13px] font-bold uppercase tracking-wider text-destructive"
              style={{
                opacity: drag && drag.dx < 0 ? stampOpacity : 0,
                transform: "rotate(12deg)",
              }}
            >
              Decline
            </span>
            {renderCardBody(topRequest)}
          </Panel>
        ) : null}
      </div>

      {topRequest ? (
        <>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-4 text-[12px]"
              onClick={() => decide(topRequest, -1)}
              disabled={acting || exiting !== null}
            >
              <X className="h-3.5 w-3.5" />
              Deny
            </Button>
            <Button
              size="sm"
              className="h-8 px-4 text-[12px]"
              onClick={() => decide(topRequest, 1)}
              disabled={acting || exiting !== null}
            >
              <Check className="h-3.5 w-3.5" />
              Approve
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {`1 of ${requests.length}`} · swipe right to approve, left to
            decline
          </p>
        </>
      ) : null}
    </div>
  );
}
