import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { Download, RefreshCw } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import {
  extractErrorMessage,
  type DispatcherVoice,
  type OpenbaseServicesResponse,
  type STTSettingsResponse,
  type TTSSettingsResponse,
  type TTSVoice,
} from "./settingsApi";

type Props = {
  onRestartScheduled: (data: OpenbaseServicesResponse, delayMs: number) => void;
};

export const DispatcherVoiceSettings: React.FC<Props> = ({
  onRestartScheduled,
}) => {
  const [ttsSettings, setTtsSettings] = useState<TTSSettingsResponse | null>(
    null,
  );
  const [sttSettings, setSttSettings] = useState<STTSettingsResponse | null>(
    null,
  );
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [dispatcherVoice, setDispatcherVoice] =
    useState<DispatcherVoice | null>(null);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedDispatcherVoiceId, setSelectedDispatcherVoiceId] =
    useState("");
  const [loadingDispatcherVoices, setLoadingDispatcherVoices] = useState(true);
  const [savingDispatcherVoice, setSavingDispatcherVoice] = useState(false);
  const [savingSttProvider, setSavingSttProvider] = useState(false);
  const [downloadingKokoro, setDownloadingKokoro] = useState(false);
  const [downloadingLocalStt, setDownloadingLocalStt] = useState(false);
  const [dispatcherVoiceError, setDispatcherVoiceError] = useState<
    string | null
  >(null);
  const [dispatcherVoiceMessage, setDispatcherVoiceMessage] = useState<
    string | null
  >(null);
  const [sttError, setSttError] = useState<string | null>(null);
  const [sttMessage, setSttMessage] = useState<string | null>(null);
  const [recreatingLiveKitThread, setRecreatingLiveKitThread] = useState(false);
  const [liveKitThreadError, setLiveKitThreadError] = useState<string | null>(
    null,
  );
  const [liveKitThreadMessage, setLiveKitThreadMessage] = useState<
    string | null
  >(null);

  const fetchDispatcherVoices = useCallback(async () => {
    setLoadingDispatcherVoices(true);
    try {
      const res = await apiFetch("/api/settings/tts/");
      if (!res.ok) {
        setDispatcherVoiceError(
          await extractErrorMessage(
            res,
            `Unable to load TTS settings: ${res.status}`,
          ),
        );
        setLoadingDispatcherVoices(false);
        return;
      }
      const data = (await res.json()) as TTSSettingsResponse;
      setTtsSettings(data);
      setVoices(data.voices);
      setDispatcherVoice(data.dispatcher_voice);
      setSelectedProvider(data.provider);
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

  const fetchSttSettings = useCallback(async () => {
    try {
      const res = await apiFetch("/api/settings/stt/");
      if (!res.ok) {
        setSttError(
          await extractErrorMessage(
            res,
            `Unable to load STT settings: ${res.status}`,
          ),
        );
        return;
      }
      const data = (await res.json()) as STTSettingsResponse;
      setSttSettings(data);
      setSttError(null);
    } catch {
      setSttError("Unable to reach the local API.");
    }
  }, []);

  useEffect(() => {
    void fetchSttSettings();
  }, [fetchSttSettings]);

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

  const handleDownloadKokoro = useCallback(async () => {
    setDownloadingKokoro(true);
    setDispatcherVoiceError(null);
    setDispatcherVoiceMessage(null);
    try {
      const res = await apiFetch("/api/settings/tts/kokoro/download/", {
        method: "POST",
      });
      if (!res.ok) {
        setDispatcherVoiceError(
          await extractErrorMessage(
            res,
            `Unable to download Kokoro voices: ${res.status}`,
          ),
        );
        setDownloadingKokoro(false);
        return;
      }
      const data = (await res.json()) as TTSSettingsResponse;
      setTtsSettings(data);
      setVoices(data.voices_by_provider[selectedProvider] ?? data.voices);
      setDispatcherVoiceMessage("Kokoro local voices downloaded.");
    } catch {
      setDispatcherVoiceError("Unable to reach the local API.");
    }
    setDownloadingKokoro(false);
  }, [selectedProvider]);

  const handleDownloadLocalStt = useCallback(async () => {
    setDownloadingLocalStt(true);
    setSttError(null);
    setSttMessage(null);
    try {
      const res = await apiFetch("/api/settings/stt/local/download/", {
        method: "POST",
      });
      if (!res.ok) {
        setSttError(
          await extractErrorMessage(
            res,
            `Unable to download local STT model: ${res.status}`,
          ),
        );
        setDownloadingLocalStt(false);
        return;
      }
      const data = (await res.json()) as STTSettingsResponse;
      setSttSettings(data);
      setSttMessage("Local MLX Whisper model downloaded.");
    } catch {
      setSttError("Unable to reach the local API.");
    }
    setDownloadingLocalStt(false);
  }, []);

  const handleSttProviderChange = useCallback(
    async (provider: string) => {
      if (
        provider === "local_mlx_whisper" &&
        !sttSettings?.local_download.ready
      ) {
        setSttError("Download Local MLX Whisper before enabling local STT.");
        return;
      }
      setSavingSttProvider(true);
      setSttError(null);
      setSttMessage(null);
      try {
        const res = await apiFetch("/api/settings/stt/", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider }),
        });
        if (!res.ok) {
          setSttError(
            await extractErrorMessage(
              res,
              `Unable to save STT settings: ${res.status}`,
            ),
          );
          setSavingSttProvider(false);
          return;
        }
        const data = (await res.json()) as STTSettingsResponse;
        setSttSettings(data);
        setSttMessage(
          "Saved. Recreate the dispatcher thread to apply STT changes.",
        );
      } catch {
        setSttError("Unable to reach the local API.");
      }
      setSavingSttProvider(false);
    },
    [sttSettings],
  );

  const handleSaveDispatcherVoice = useCallback(async () => {
    if (!selectedDispatcherVoiceId) {
      return;
    }
    setSavingDispatcherVoice(true);
    setDispatcherVoiceError(null);
    setDispatcherVoiceMessage(null);
    try {
      const res = await apiFetch("/api/settings/tts/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          voice_id: selectedDispatcherVoiceId,
        }),
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
      const data = (await res.json()) as TTSSettingsResponse;
      setTtsSettings(data);
      setVoices(data.voices);
      setDispatcherVoice(data.dispatcher_voice);
      setSelectedDispatcherVoiceId(data.dispatcher_voice.id);
      setDispatcherVoiceMessage(
        "Saved. Recreate the dispatcher thread to apply this provider and voice.",
      );
    } catch {
      setDispatcherVoiceError("Unable to reach the local API.");
    }
    setSavingDispatcherVoice(false);
  }, [selectedDispatcherVoiceId, selectedProvider]);

  const selectedDispatcherVoice = voices.find(
    (voice) => voice.id === selectedDispatcherVoiceId,
  );
  const currentProviderEntry = ttsSettings?.providers.find(
    (provider) => provider.id === dispatcherVoice?.provider,
  );
  const kokoroReady = Boolean(ttsSettings?.local_download.ready);
  const selectedProviderNeedsDownload =
    selectedProvider === "kokoro" && !kokoroReady;
  const localSttReady = Boolean(sttSettings?.local_download.ready);
  const selectedSttProvider = sttSettings?.provider ?? "";
  const selectedSttNeedsDownload =
    selectedSttProvider === "local_mlx_whisper" && !localSttReady;
  const currentSttProviderEntry = sttSettings?.providers.find(
    (provider) => provider.id === sttSettings.provider,
  );

  const handleProviderChange = useCallback(
    (providerId: string) => {
      setSelectedProvider(providerId);
      const nextProvider =
        ttsSettings?.providers.find((provider) => provider.id === providerId) ??
        null;
      const nextVoices = ttsSettings?.voices_by_provider[providerId] ?? [];
      setVoices(nextVoices);
      setSelectedDispatcherVoiceId(nextVoices[0]?.id ?? "");
      setDispatcherVoiceMessage(null);
      setDispatcherVoiceError(
        nextProvider?.id === "kokoro" && !kokoroReady
          ? "Download Kokoro voices before saving local TTS."
          : null,
      );
    },
    [kokoroReady, ttsSettings],
  );

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border px-3 py-2.5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Text-to-speech provider
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Select the provider and voice used by the dispatcher and Super
            Agents. Recreate the dispatcher thread to apply a saved change.
          </p>
          {dispatcherVoice ? (
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              Current:{" "}
              {currentProviderEntry?.name ?? dispatcherVoice.provider ?? "TTS"}{" "}
              · {dispatcherVoice.name}
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
            value={selectedProvider}
            onValueChange={handleProviderChange}
            disabled={loadingDispatcherVoices || savingDispatcherVoice}
          >
            <SelectTrigger className="h-8 min-w-0 text-[12px] sm:w-44">
              <SelectValue
                placeholder={
                  loadingDispatcherVoices ? "Loading…" : "Select provider"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {ttsSettings?.providers.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedDispatcherVoiceId}
            onValueChange={setSelectedDispatcherVoiceId}
            disabled={
              loadingDispatcherVoices ||
              savingDispatcherVoice ||
              selectedProviderNeedsDownload
            }
          >
            <SelectTrigger className="h-8 min-w-0 text-[12px] sm:w-72">
              <SelectValue
                placeholder={
                  loadingDispatcherVoices ? "Loading voices…" : "Select voice"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProvider === "kokoro" && !kokoroReady ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-[12px]"
              onClick={() => {
                void handleDownloadKokoro();
              }}
              disabled={downloadingKokoro}
            >
              <Download className="h-3 w-3" />
              {downloadingKokoro ? "Downloading…" : "Download"}
            </Button>
          ) : null}
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
              selectedProviderNeedsDownload ||
              !selectedDispatcherVoiceId ||
              (selectedDispatcherVoiceId === dispatcherVoice?.id &&
                selectedProvider === dispatcherVoice?.provider)
            }
          >
            {savingDispatcherVoice ? "Saving…" : "Save voice"}
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-3 px-3 py-2.5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Speech-to-text provider
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Select cloud transcription, Openbase Cloud, or the local MLX Whisper
            model.
          </p>
          {sttSettings ? (
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              Current: {currentSttProviderEntry?.name ?? sttSettings.provider}
            </p>
          ) : null}
          {sttSettings ? (
            <p className="mt-1 truncate font-mono text-[10.5px] text-muted-foreground">
              {sttSettings.local_download.model}
            </p>
          ) : null}
          {sttMessage ? (
            <p className="mt-1 text-[12px] text-success">{sttMessage}</p>
          ) : null}
          {sttError ? (
            <p className="mt-1 text-[12px] text-destructive">{sttError}</p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <Select
            value={selectedSttProvider}
            onValueChange={(provider) => {
              void handleSttProviderChange(provider);
            }}
            disabled={savingSttProvider || !sttSettings}
          >
            <SelectTrigger className="h-8 min-w-0 text-[12px] sm:w-52">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {sttSettings?.providers.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSttNeedsDownload ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-[12px]"
              onClick={() => {
                void handleDownloadLocalStt();
              }}
              disabled={downloadingLocalStt}
            >
              <Download className="h-3 w-3" />
              {downloadingLocalStt ? "Downloading…" : "Download"}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-border px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Dispatcher thread
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
          <RefreshCw
            className={`h-3 w-3 ${recreatingLiveKitThread ? "animate-spin" : ""}`}
          />
          {recreatingLiveKitThread ? "Recreating…" : "Recreate thread"}
        </Button>
      </div>
    </div>
  );
};
