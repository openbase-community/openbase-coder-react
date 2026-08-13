import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { useVoiceCall, type VoiceAgentState } from "@/hooks/use-voice-call";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";

function agentStateLabel(state: VoiceAgentState) {
  switch (state) {
    case "initializing":
      return "Dispatcher is joining…";
    case "listening":
      return "Dispatcher is listening";
    case "thinking":
      return "Dispatcher is thinking…";
    case "speaking":
      return "Dispatcher is speaking";
    default:
      return "Waiting for the dispatcher…";
  }
}

const Call = () => {
  const {
    status,
    muted,
    agentState,
    roomName,
    error,
    audioContainerRef,
    start,
    end,
    toggleMute,
  } = useVoiceCall();

  const inCall = status === "connected";
  const connecting = status === "connecting";

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            Call
          </h1>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Speak with the dispatcher, hands-free, like the iOS call tab
          </p>
        </div>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        <div className="rounded border border-border bg-surface px-4 py-10 text-center">
          {inCall ? (
            <>
              <p className="text-[13px] font-medium text-foreground">
                {agentStateLabel(agentState)}
              </p>
              {roomName ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Room {roomName}
                </p>
              ) : null}
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant={muted ? "destructive" : "outline"}
                  size="sm"
                  className="h-8 px-3 text-[12px]"
                  onClick={() => void toggleMute()}
                >
                  {muted ? (
                    <MicOff className="h-3.5 w-3.5" />
                  ) : (
                    <Mic className="h-3.5 w-3.5" />
                  )}
                  {muted ? "Unmute" : "Mute"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 px-3 text-[12px]"
                  onClick={end}
                >
                  <PhoneOff className="h-3.5 w-3.5" />
                  End call
                </Button>
              </div>
            </>
          ) : (
            <>
              <Phone className="mx-auto h-5 w-5 text-muted-foreground/40" />
              <p className="mt-2 text-[12px] text-muted-foreground">
                {connecting
                  ? "Connecting to the voice room…"
                  : "Start a voice call with the dispatcher on this Mac."}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 h-8 px-3 text-[12px]"
                onClick={() => void start()}
                disabled={connecting}
              >
                <Phone className="h-3.5 w-3.5" />
                {connecting ? "Connecting…" : "Start call"}
              </Button>
            </>
          )}
        </div>

        {/* Remote (agent) audio elements attach here; never visible. */}
        <div ref={audioContainerRef} className="hidden" />
      </div>
    </DashboardLayout>
  );
};

export default Call;
