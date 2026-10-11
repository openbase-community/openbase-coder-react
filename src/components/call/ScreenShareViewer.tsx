import { Button } from "@/components/ui/button";
import type { ScreenShareStatus } from "@/hooks/use-screen-share";
import {
  clickInputs,
  keyInput,
  normalizedVideoPosition,
  scrollInput,
  type RemoteControlInput,
} from "@/lib/screen-share-control";
import type { RemoteVideoTrack } from "livekit-client";
import { MousePointerClick, Square } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  track: RemoteVideoTrack | null;
  status: ScreenShareStatus;
  onStop: () => void;
  onSetControlEnabled: (enabled: boolean) => void;
  onInput: (inputs: RemoteControlInput[]) => void;
};

/**
 * The backend computer's shared screen in the console call (shown while an
 * agent-started share is active), with Stop and, when remote control is on,
 * click, type and scroll straight on the video.
 */
export function ScreenShareViewer({ track, status, onStop, onSetControlEnabled, onInput }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!track || !video) return;
    track.attach(video);
    return () => {
      track.detach(video);
    };
  }, [track]);

  if (!track) return null;

  const controlOn = status.controlEnabled;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant={controlOn ? "default" : "outline"}
          size="sm"
          className="h-8 px-3 text-[12px]"
          onClick={() => onSetControlEnabled(!controlOn)}
          data-testid="call-remote-control"
        >
          <MousePointerClick className="h-3.5 w-3.5" />
          {controlOn ? "Remote control on" : "Remote control"}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="h-8 px-3 text-[12px]"
          onClick={onStop}
          disabled={status.stopping}
          data-testid="call-stop-share"
        >
          <Square className="h-3.5 w-3.5" />
          {status.stopping ? "Stopping…" : "Stop sharing"}
        </Button>
      </div>
      {controlOn && status.controlMessage ? (
        <p className="text-center text-[12px] text-destructive" data-testid="call-control-message">
          {status.controlMessage}
        </p>
      ) : controlOn ? (
        <p className="text-center text-[11px] text-muted-foreground">
          Click, type and scroll on the screen below to control the computer.
        </p>
      ) : null}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        tabIndex={controlOn ? 0 : -1}
        data-testid="call-screen-share-video"
        className={`mx-auto max-h-[70vh] w-full rounded border border-border bg-black object-contain ${controlOn ? "cursor-crosshair outline-none ring-2 ring-primary/60" : ""}`}
        onContextMenu={(event) => {
          if (controlOn) event.preventDefault();
        }}
        onPointerDown={(event) => {
          if (!controlOn) return;
          event.preventDefault();
          event.currentTarget.focus();
          const position = normalizedVideoPosition(event, event.currentTarget);
          if (position) onInput(clickInputs(position, event.button));
        }}
        onWheel={(event) => {
          if (!controlOn) return;
          onInput([scrollInput(event.deltaX, event.deltaY)]);
        }}
        onKeyDown={(event) => {
          if (!controlOn) return;
          const input = keyInput(event);
          if (!input) return;
          event.preventDefault();
          onInput([input]);
        }}
      />
    </div>
  );
}
