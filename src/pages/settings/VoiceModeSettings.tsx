import { Panel } from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import React, { useCallback, useEffect, useState } from "react";
import {
  extractErrorMessage,
  type VoiceMode,
  type VoiceModeSettingsResponse,
} from "./settingsApi";

export const VoiceModeSettings: React.FC = () => {
  const [settings, setSettings] = useState<VoiceModeSettingsResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/settings/voice-mode/");
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to load voice mode: ${res.status}`,
          ),
        );
        setLoading(false);
        return;
      }
      setSettings((await res.json()) as VoiceModeSettingsResponse);
      setError(null);
    } catch {
      setError("Unable to reach the local API.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const saveMode = useCallback(async (voiceMode: VoiceMode) => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiFetch("/api/settings/voice-mode/", {
        method: "PUT",
        body: JSON.stringify({ voice_mode: voiceMode }),
      });
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to save voice mode: ${res.status}`,
          ),
        );
        setSaving(false);
        return;
      }
      const data = (await res.json()) as VoiceModeSettingsResponse;
      setSettings(data);
      setMessage(data.changed ? `Saved. ${data.applies_hint}` : null);
    } catch {
      setError("Unable to reach the local API.");
    }
    setSaving(false);
  }, []);

  const current = settings?.options.find(
    (option) => option.id === settings.voice_mode,
  );

  return (
    <Panel>
      <div className="flex flex-col gap-3 border-b border-border px-3 py-2.5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Voice mode
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {current?.summary ??
              "Choose whether calls go through the Dispatcher or straight to a fresh thread."}
          </p>
          {message ? (
            <p className="mt-1 text-[12px] text-success">{message}</p>
          ) : null}
          {error ? (
            <p className="mt-1 text-[12px] text-destructive">{error}</p>
          ) : null}
        </div>
        <Select
          value={settings?.voice_mode ?? ""}
          onValueChange={(value) => {
            void saveMode(value as VoiceMode);
          }}
          disabled={loading || saving || !settings}
        >
          <SelectTrigger className="h-8 w-full min-w-0 text-[12px] lg:w-[190px]">
            <SelectValue placeholder={loading ? "Loading..." : "Voice mode"} />
          </SelectTrigger>
          <SelectContent>
            {settings?.options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Panel>
  );
};
