import type { TurnInfo } from "@/types/session";
import type { Ref } from "react";

export function UserInputBlock({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <div className="rounded border border-border bg-surface-muted px-2.5 py-1.5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <pre className="mt-0.5 whitespace-pre-wrap break-words font-sans text-[12.5px] text-foreground">
        {text}
      </pre>
    </div>
  );
}

/**
 * The shared body of a turn: the user's prompt, any steering messages sent
 * while the turn ran, and the agent's output/stderr. Used by both the
 * current-turn section and turn-history entries so threads and the
 * dispatcher render turns identically.
 */
export function TurnBody({
  turn,
  outputRef,
}: {
  turn: TurnInfo;
  outputRef?: Ref<HTMLPreElement>;
}) {
  return (
    <>
      <UserInputBlock label="prompt" text={turn.prompt} />
      {(turn.steers ?? []).map((steer, index) => (
        <UserInputBlock
          key={steer.created_at ?? index}
          label="steer"
          text={steer.text}
        />
      ))}
      {turn.accumulated_output ? (
        <pre
          ref={outputRef}
          className="ob-turn-output max-h-96 overflow-auto whitespace-pre-wrap rounded bg-foreground p-2.5 font-mono text-[11.5px] text-background"
        >
          {turn.accumulated_output}
        </pre>
      ) : null}
      {turn.accumulated_stderr ? (
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-destructive/95 p-2.5 font-mono text-[11.5px] text-destructive-foreground">
          {turn.accumulated_stderr}
        </pre>
      ) : null}
    </>
  );
}
