import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { RefreshCw } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import {
  extractErrorMessage,
  type CartesiaVoice,
  type CartesiaVoiceSettingsResponse,
  type DispatcherVoice,
  type DispatcherVoiceUpdateResponse,
  type OpenbaseServicesResponse,
} from "./settingsApi";

type Props = {
  onRestartScheduled: (data: OpenbaseServicesResponse, delayMs: number) => void;
};

export const DispatcherVoiceSettings: React.FC<Props> = ({ onRestartScheduled }) => {
  const [cartesiaVoices, setCartesiaVoices] = useState<CartesiaVoice[]>([]);
  const [dispatcherVoice, setDispatcherVoice] = useState<DispatcherVoice | null>(null);
  const [selectedDispatcherVoiceId, setSelectedDispatcherVoiceId] = useState("");
  const [loadingDispatcherVoices, setLoadingDispatcherVoices] = useState(true);
  const [savingDispatcherVoice, setSavingDispatcherVoice] = useState(false);
  const [dispatcherVoiceError, setDispatcherVoiceError] = useState<string | null>(null);
  const [dispatcherVoiceMessage, setDispatcherVoiceMessage] = useState<string | null>(null);
  const [recreatingLiveKitThread, setRecreatingLiveKitThread] = useState(false);
  const [liveKitThreadError, setLiveKitThreadError] = useState<string | null>(null);
  const [liveKitThreadMessage, setLiveKitThreadMessage] = useState<string | null>(null);

  const fetchDispatcherVoices = useCallback(async () => {
    setLoadingDispatcherVoices(true);
    try {
      const res = await apiFetch("/api/settings/cartesia-voices/");
      if (!res.ok) {
        setDispatcherVoiceError(
          await extractErrorMessage(
            res,
            `Unable to load Cartesia voices: ${res.status}`,
          ),
        );
        setLoadingDispatcherVoices(false);
        return;
      }
      const data = (await res.json()) as CartesiaVoiceSettingsResponse;
      setCartesiaVoices(data.voices);
      setDispatcherVoice(data.dispatcher_voice);
      setSelectedDispatcherVoiceId(data.dispatcher_voice.id);
      setDispatcherVoiceError(null);
      setDispatcherVoiceMessage(null);
    } catch {
      setDispatcherVoiceError("Unable to reach the local API.");
    }
    setLoadingDispatcherVoices(false);
  }, []);

  useEffect(() => {
    void fetchDispatcherVoices();
  }, [fetchDispatcherVoices]);

  const handleRecreateLiveKitThread = useCallback(async () => {
    setRecreatingLiveKitThread(true);
    setLiveKitThreadError(null);
    setLiveKitThreadMessage(null);
    try {
      const res = await apiFetch("/api/settings/restart/", {
        method: "POST",
        body: JSON.stringify({ recreate_dispatcher: true }),
      });
      if (!res.ok) {
        setLiveKitThreadError(
          await extractErrorMessage(
            res,
            `Unable to recreate LiveKit thread: ${res.status}`,
          ),
        );
        setRecreatingLiveKitThread(false);
        return;
      }
      const data = (await res.json()) as OpenbaseServicesResponse;
      onRestartScheduled(data, 4000);
      setLiveKitThreadMessage("Dispatcher recreation restart scheduled.");
    } catch {
      setLiveKitThreadError("Unable to reach the local API.");
    }
    setRecreatingLiveKitThread(false);
  }, [onRestartScheduled]);

  const handleSaveDispatcherVoice = useCallback(async () => {
    if (!selectedDispatcherVoiceId) {
      return;
    }
    setSavingDispatcherVoice(true);
    setDispatcherVoiceError(null);
    setDispatcherVoiceMessage(null);
    try {
      const res = await apiFetch("/api/settings/dispatcher-voice/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: selectedDispatcherVoiceId }),
      });
      if (!res.ok) {
        setDispatcherVoiceError(
          await extractErrorMessage(
            res,
            `Unable to save dispatcher voice: ${res.status}`,
          ),
        );
        setSavingDispatcherVoice(false);
        return;
      }
      const data = (await res.json()) as DispatcherVoiceUpdateResponse;
      setDispatcherVoice(data.dispatcher_voice);
      setSelectedDispatcherVoiceId(data.dispatcher_voice.id);
      setDispatcherVoiceMessage(
        "Saved. Recreate the dispatcher thread to apply this voice.",
      );
    } catch {
      setDispatcherVoiceError("Unable to reach the local API.");
    }
    setSavingDispatcherVoice(false);
  }, [selectedDispatcherVoiceId]);

  const selectedDispatcherVoice = cartesiaVoices.find(
    (voice) => voice.id === selectedDispatcherVoiceId,
  );

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border px-3 py-2.5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Dispatcher voice
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Select the Cartesia voice used by the dispatcher. Recreate the
            dispatcher thread to apply a saved change.
          </p>
          {dispatcherVoice ? (
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              Current: {dispatcherVoice.name}
            </p>
          ) : null}
          {selectedDispatcherVoice ? (
            <p className="mt-1 truncate font-mono text-[10.5px] text-muted-foreground">
              {selectedDispatcherVoice.id}
            </p>
          ) : null}
          {dispatcherVoiceMessage ? (
            <p className="mt-1 text-[12px] text-success">
              {dispatcherVoiceMessage}
            </p>
          ) : null}
          {dispatcherVoiceError ? (
            <p className="mt-1 text-[12px] text-destructive">
              {dispatcherVoiceError}
            </p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <Select
            value={selectedDispatcherVoiceId}
            onValueChange={setSelectedDispatcherVoiceId}
            disabled={loadingDispatcherVoices || savingDispatcherVoice}
          >
            <SelectTrigger className="h-8 min-w-0 text-[12px] sm:w-72">
              <SelectValue
                placeholder={
                  loadingDispatcherVoices ? "Loading voices…" : "Select voice"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {cartesiaVoices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[12px]"
            onClick={() => {
              void handleSaveDispatcherVoice();
            }}
            disabled={
              savingDispatcherVoice ||
              loadingDispatcherVoices ||
              !selectedDispatcherVoiceId ||
              selectedDispatcherVoiceId === dispatcherVoice?.id
            }
          >
            {savingDispatcherVoice ? "Saving…" : "Save voice"}
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            LiveKit dispatcher thread
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Create a fresh dispatcher thread and restart the LiveKit agent.
          </p>
          {liveKitThreadMessage ? (
            <p className="mt-1 text-[12px] text-success">
              {liveKitThreadMessage}
            </p>
          ) : null}
          {liveKitThreadError ? (
            <p className="mt-1 text-[12px] text-destructive">
              {liveKitThreadError}
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-[12px]"
          onClick={() => {
            void handleRecreateLiveKitThread();
          }}
          disabled={recreatingLiveKitThread}
        >
          <RefreshCw className={`h-3 w-3 ${recreatingLiveKitThread ? "animate-spin" : ""}`} />
          {recreatingLiveKitThread ? "Recreating…" : "Recreate thread"}
        </Button>
      </div>
    </div>
  );
};
