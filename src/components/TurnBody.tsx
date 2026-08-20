import { StatusBadge } from "@/components/StatusBadge";
import { TurnFileEdits } from "@/components/TurnFileEdits";
import { relativeTimeShort } from "@/lib/relative-time";
import { shortModelLabel } from "@/lib/thread-display";
import { voicePromptForDisplay } from "@/lib/voice-display";
import type { TurnInfo } from "@/types/session";
import { ChevronDown, CornerUpLeft } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * A user-authored message (prompt, steer, or queued follow-up) rendered as a
 * right-pinned chat bubble that occupies at most two-thirds of the transcript
 * column. Steers carry a small inline icon so they read as a nudge rather than
 * a fresh prompt; everything else looks like a normal message.
 */
export function UserBubble({
  text,
  steer = false,
  hint,
}: {
  text: string;
  steer?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[82%] rounded-2xl bg-user-message px-3.5 py-2 text-[13px] leading-relaxed text-foreground">
        {hint ? (
          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {hint}
          </p>
        ) : null}
        <div className="flex gap-1.5">
          {steer ? (
            <CornerUpLeft
              className="mt-[3px] h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-label="steer"
            />
          ) : null}
          <span className="whitespace-pre-wrap break-words">
            {voicePromptForDisplay(text)}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Kept for callers that still import the old name. */
export const UserInputBlock = ({
  label,
  text,
}: {
  label: string;
  text: string;
}) => (
  <UserBubble
    text={text}
    steer={label === "steer"}
    hint={label === "queued" ? "Queued" : undefined}
  />
);

/**
 * Hover-only turn metadata rendered just below the response: a relative
 * timestamp plus anything non-default worth surfacing (a non-completed status,
 * a non-zero exit code, the model / reasoning effort). The default happy path
 * (completed, exit 0) shows nothing but the time.
 */
function TurnMeta({ turn }: { turn: TurnInfo }) {
  const when = turn.completed_at ?? turn.started_at;
  const showExit = turn.return_code !== null && turn.return_code !== 0;
  const bits: ReactNode[] = [];
  if (showExit) {
    bits.push(
      <span key="exit" className="text-destructive">
        exit {turn.return_code}
      </span>,
    );
  }
  if (turn.model) {
    bits.push(
      <span key="model" className="font-mono" title={turn.model}>
        {shortModelLabel(turn.model)}
      </span>,
    );
  }
  if (turn.reasoning_effort) {
    bits.push(
      <span key="effort" className="font-mono uppercase">
        {turn.reasoning_effort}
      </span>,
    );
  }

  return (
    <div className="flex items-center gap-2 pt-0.5 text-[10.5px] text-muted-foreground opacity-0 transition-opacity group-hover/turn:opacity-100">
      {when ? (
        <span title={new Date(when).toLocaleString()}>
          {relativeTimeShort(when)}
        </span>
      ) : null}
      {bits}
    </div>
  );
}

/**
 * The full body of a single turn, rendered chat-style: the user's prompt as a
 * right-pinned bubble, any steers as bubbles beneath it, and the agent's
 * response as plain text (no box, no monospace) that fills the column width.
 * Hovering the prompt bubble reveals a chevron on its left that collapses the
 * whole response; when collapsed the chevron stays put as a reminder.
 */
export function TurnBody({
  turn,
  outputRef,
  defaultOpen = true,
  directory,
}: {
  turn: TurnInfo;
  outputRef?: Ref<HTMLDivElement>;
  defaultOpen?: boolean;
  directory?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const editedPaths = turn.file_edits ?? [];
  const hasResponse =
    Boolean(turn.accumulated_output || turn.accumulated_stderr) ||
    editedPaths.length > 0;
  const showStatusIcon = turn.status !== "completed";
  const responseInner = (
    <>
      {turn.accumulated_output ? (
        <div ref={outputRef} className="max-h-[36rem] overflow-auto">
          <article className="prose prose-sm max-w-none break-words dark:prose-invert [&>:first-child]:mt-0 [&>:last-child]:mb-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {turn.accumulated_output}
            </ReactMarkdown>
          </article>
        </div>
      ) : null}
      {turn.accumulated_stderr ? (
        <div className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-destructive">
          {turn.accumulated_stderr}
        </div>
      ) : null}
      <TurnFileEdits paths={editedPaths} directory={directory} />
      <TurnMeta turn={turn} />
    </>
  );

  return (
    <div className="group/turn space-y-2">
      <div className="flex items-start justify-end gap-1">
        {hasResponse ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Collapse response" : "Expand response"}
            className={`mt-1.5 shrink-0 rounded p-0.5 text-muted-foreground transition hover:text-foreground ${
              open
                ? "opacity-0 group-hover/turn:opacity-100"
                : "opacity-100"
            }`}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`}
            />
          </button>
        ) : null}
        <UserBubble text={turn.prompt} />
      </div>

      {(turn.steers ?? []).map((steer, index) => (
        <UserBubble key={steer.created_at ?? index} text={steer.text} steer />
      ))}

      {open && (hasResponse || showStatusIcon) ? (
        showStatusIcon ? (
          <div className="flex gap-2">
            <div className="shrink-0 pt-0.5">
              <StatusBadge status={turn.status} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">{responseInner}</div>
          </div>
        ) : (
          <div className="space-y-1">{responseInner}</div>
        )
      ) : null}
    </div>
  );
}
