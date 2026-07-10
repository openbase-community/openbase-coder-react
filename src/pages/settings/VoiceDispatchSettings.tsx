import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { RefreshCw, Save } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import {
  extractErrorMessage,
  type VoiceDispatchProvider,
  type VoiceDispatchSettingsResponse,
} from "./settingsApi";

export const VoiceDispatchSettings: React.FC = () => {
  const [settings, setSettings] =
    useState<VoiceDispatchSettingsResponse | null>(null);
  const [provider, setProvider] = useState<VoiceDispatchProvider | "">("");
  const [apiKey, setApiKey] = useState("");
  const [agentId, setAgentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applySettings = useCallback((data: VoiceDispatchSettingsResponse) => {
    setSettings(data);
    setProvider(data.provider);
    setAgentId(data.vocalbridge.agent_id ?? "");
    setApiKey("");
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/settings/voice-dispatch/");
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to load voice dispatch settings: ${res.status}`,
          ),
        );
        setLoading(false);
        return;
      }
      applySettings((await res.json()) as VoiceDispatchSettingsResponse);
      setMessage(null);
      setError(null);
    } catch {
      setError("Unable to reach the local API.");
    }
    setLoading(false);
  }, [applySettings]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const saveSettings = useCallback(async () => {
    if (!provider) {
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const body: Record<string, string> = { provider };
      if (apiKey.trim()) {
        body.vocalbridge_api_key = apiKey.trim();
      }
      if (agentId !== (settings?.vocalbridge.agent_id ?? "")) {
        body.vocalbridge_agent_id = agentId.trim();
      }
      const res = await apiFetch("/api/settings/voice-dispatch/", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to save voice dispatch settings: ${res.status}`,
          ),
        );
        setSaving(false);
        return;
      }
      applySettings((await res.json()) as VoiceDispatchSettingsResponse);
      setMessage("Voice dispatch settings saved.");
    } catch {
      setError("Unable to reach the local API.");
    }
    setSaving(false);
  }, [agentId, apiKey, applySettings, provider, settings]);

  const selectedOption = settings?.providers.find(
    (option) => option.id === provider,
  );
  const dirty =
    Boolean(settings) &&
    (provider !== settings?.provider ||
      Boolean(apiKey.trim()) ||
      agentId !== (settings?.vocalbridge.agent_id ?? ""));
  const missingVocalBridgeKey =
    provider === "vocalbridge" &&
    !settings?.vocalbridge.api_key_configured &&
    !apiKey.trim();
  const canSave =
    dirty && Boolean(provider) && !missingVocalBridgeKey && !loading && !saving;

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium text-foreground">
              Voice dispatch
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              How calls reach a dispatcher: the local LiveKit pipeline, or a
              hosted VocalBridge voice agent backed by a restricted local
              dispatcher.
            </p>
            {message ? (
              <p className="mt-1 text-[12px] text-success">{message}</p>
            ) : null}
            {error ? (
              <p className="mt-1 text-[12px] text-destructive">{error}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-[12px]"
              onClick={() => {
                void fetchSettings();
              }}
              disabled={loading || saving}
              title="Refresh voice dispatch settings"
            >
              <RefreshCw
                className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-[12px]"
              onClick={() => {
                void saveSettings();
              }}
              disabled={!canSave}
            >
              <Save className="h-3 w-3" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-foreground">Provider</p>
            <p className="text-[11px] text-muted-foreground">
              {selectedOption?.summary ?? "Choose how calls are answered."}
            </p>
          </div>
          <Select
            value={provider}
            onValueChange={(value) => {
              setProvider(value as VoiceDispatchProvider);
              setMessage(null);
              setError(null);
            }}
            disabled={loading || saving}
          >
            <SelectTrigger className="h-8 w-full min-w-0 text-[12px] sm:w-[190px]">
              <SelectValue placeholder={loading ? "Loading..." : "Provider"} />
            </SelectTrigger>
            <SelectContent>
              {settings?.providers.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {provider === "vocalbridge" ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-foreground">
                  VocalBridge API key
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {settings?.vocalbridge.api_key_configured
                    ? "A key is configured. Enter a new one to replace it."
                    : "From your agent's page on vocalbridgeai.com."}
                </p>
              </div>
              <Input
                type="password"
                value={apiKey}
                onChange={(event) => {
                  setApiKey(event.target.value);
                  setMessage(null);
                  setError(null);
                }}
                placeholder={
                  settings?.vocalbridge.api_key_configured
                    ? "••••••••"
                    : "vb_..."
                }
                autoComplete="off"
                className="h-8 w-full min-w-0 text-[12px] sm:w-[260px]"
                disabled={loading || saving}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-foreground">
                  Agent ID (optional)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Only needed with an account-level API key.
                </p>
              </div>
              <Input
                value={agentId}
                onChange={(event) => {
                  setAgentId(event.target.value);
                  setMessage(null);
                  setError(null);
                }}
                placeholder="Agent UUID"
                autoComplete="off"
                className="h-8 w-full min-w-0 text-[12px] sm:w-[260px]"
                disabled={loading || saving}
              />
            </div>
            {missingVocalBridgeKey ? (
              <p className="text-[11px] text-warning">
                Add a VocalBridge API key to switch dispatch to VocalBridge.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};
