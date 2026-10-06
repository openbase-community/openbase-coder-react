import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { RefreshCw, Save } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  extractErrorMessage,
  type VoiceEngine,
  type VoiceModelSettingsResponse,
} from "./settingsApi";

const VOICE_ENGINE_LABELS: Record<VoiceEngine, string> = {
  live: "Live",
  pipeline: "Classic pipeline",
};

const OPENAI_LIVE_VOICE_PROVIDER_ID = "openai";

type Props = {
  /**
   * Reports the saved voice engine whenever it is loaded or changed, so the
   * STT/TTS provider pickers can mark themselves as pipeline-only.
   */
  onEngineChange?: (engine: VoiceEngine | null) => void;
};

// A span (not the Badge div) so it can sit inside the picker's <p> lines.
const DefaultBadge: React.FC = () => (
  <span
    className={cn(
      badgeVariants({ variant: "outline" }),
      "ml-1.5 px-1.5 py-0 text-[9.5px] font-medium uppercase tracking-wide text-muted-foreground",
    )}
  >
    Default
  </span>
);

export const VoiceModelSettings: React.FC<Props> = ({ onEngineChange }) => {
  const [settings, setSettings] = useState<VoiceModelSettingsResponse | null>(
    null,
  );
  const [model, setModel] = useState("");
  const [liveVoiceProvider, setLiveVoiceProvider] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"model" | "provider" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applySettings = useCallback(
    (data: VoiceModelSettingsResponse) => {
      setSettings(data);
      setModel(data.model);
      setLiveVoiceProvider(data.live_voice_provider);
      onEngineChange?.(data.engine);
    },
    [onEngineChange],
  );

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/settings/voice-model/");
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to load voice model settings: ${res.status}`,
          ),
        );
        setLoading(false);
        return;
      }
      applySettings((await res.json()) as VoiceModelSettingsResponse);
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

  const saveSetting = useCallback(
    async (
      which: "model" | "provider",
      body: { model?: string; live_voice_provider?: string },
    ) => {
      setSaving(which);
      setMessage(null);
      setError(null);
      try {
        const res = await apiFetch("/api/settings/voice-model/", {
          method: "PUT",
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          setError(
            await extractErrorMessage(
              res,
              `Unable to save voice model settings: ${res.status}`,
            ),
          );
          setSaving(null);
          return;
        }
        const data = (await res.json()) as VoiceModelSettingsResponse;
        applySettings(data);
        setMessage(
          `${which === "model" ? "Voice model" : "GPT-Live source"} saved. ${data.applies_hint}`,
        );
      } catch {
        setError("Unable to reach the local API.");
      }
      setSaving(null);
    },
    [applySettings],
  );

  const options = settings?.options ?? [];
  const providerOptions = settings?.live_voice_provider_options ?? [];
  const currentOption = options.find((option) => option.id === settings?.model);
  const selectedOption = options.find((option) => option.id === model);
  const selectedEngine = selectedOption?.engine ?? settings?.engine ?? null;
  const showProviderRow = selectedEngine === "live";
  const currentProviderOption = providerOptions.find(
    (option) => option.id === settings?.live_voice_provider,
  );
  const selectedProviderOption = providerOptions.find(
    (option) => option.id === liveVoiceProvider,
  );
  const busy = loading || saving !== null;
  const canSaveModel =
    Boolean(settings) && Boolean(model) && !busy && model !== settings?.model;
  const canSaveProvider =
    Boolean(settings) &&
    Boolean(liveVoiceProvider) &&
    !busy &&
    liveVoiceProvider !== settings?.live_voice_provider;

  return (
    <Panel>
      <div className="flex flex-col gap-3 border-b border-border px-3 py-2.5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Voice model
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            The model that listens and speaks on calls. Picking a model picks
            its engine; Super Agents do the work either way.
          </p>
          {settings ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
              <span>
                Current: {currentOption?.label ?? settings.model} (
                {VOICE_ENGINE_LABELS[settings.engine] ?? settings.engine})
              </span>
              {currentOption?.is_default ? <DefaultBadge /> : null}
            </p>
          ) : null}
          {selectedOption ? (
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {selectedOption.description}
            </p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <Select
            value={model}
            onValueChange={(value) => {
              setModel(value);
              setMessage(null);
              setError(null);
            }}
            disabled={busy || options.length === 0}
          >
            <SelectTrigger
              className="h-8 min-w-0 text-[12px] sm:w-64"
              aria-label="Voice model"
            >
              <SelectValue
                placeholder={loading ? "Loading..." : "Select voice model"}
              />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <span className="inline-flex items-center">
                    {option.label}
                    {option.is_default ? <DefaultBadge /> : null}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[12px]"
            onClick={() => {
              void saveSetting("model", { model });
            }}
            disabled={!canSaveModel}
          >
            <Save className="h-3 w-3" />
            {saving === "model" ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      {showProviderRow ? (
        <div className="flex flex-col gap-3 border-b border-border px-3 py-2.5 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium text-foreground">
              GPT-Live source
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Where GPT-Live comes from when it is the voice model.
            </p>
            {settings ? (
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
                <span>
                  Current:{" "}
                  {currentProviderOption?.label ?? settings.live_voice_provider}
                </span>
                {currentProviderOption?.is_default ? <DefaultBadge /> : null}
              </p>
            ) : null}
            {selectedProviderOption ? (
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                {selectedProviderOption.description}
              </p>
            ) : null}
            {liveVoiceProvider === OPENAI_LIVE_VOICE_PROVIDER_ID ? (
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                Needs <code className="font-mono">OPENAI_API_KEY</code> in{" "}
                <code className="font-mono">~/.openbase/.env</code>. Add it
                under{" "}
                <Link
                  className="underline"
                  to="/dashboard/settings?section=advanced"
                >
                  Advanced → Environment Variables
                </Link>
                .
              </p>
            ) : null}
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <Select
              value={liveVoiceProvider}
              onValueChange={(value) => {
                setLiveVoiceProvider(value);
                setMessage(null);
                setError(null);
              }}
              disabled={busy || providerOptions.length === 0}
            >
              <SelectTrigger
                className="h-8 min-w-0 text-[12px] sm:w-64"
                aria-label="GPT-Live source"
              >
                <SelectValue
                  placeholder={loading ? "Loading..." : "Select source"}
                />
              </SelectTrigger>
              <SelectContent>
                {providerOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <span className="inline-flex items-center">
                      {option.label}
                      {option.is_default ? <DefaultBadge /> : null}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-[12px]"
              onClick={() => {
                void saveSetting("provider", {
                  live_voice_provider: liveVoiceProvider,
                });
              }}
              disabled={!canSaveProvider}
            >
              <Save className="h-3 w-3" />
              {saving === "provider" ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          {message ? (
            <p className="text-[12px] text-success">{message}</p>
          ) : null}
          {error ? (
            <p className="text-[12px] text-destructive">{error}</p>
          ) : null}
          {!message && !error && settings ? (
            <p className="text-[11px] text-muted-foreground">
              {settings.applies_hint}
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-[12px]"
          onClick={() => {
            void fetchSettings();
          }}
          disabled={busy}
          title="Refresh voice model settings"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
    </Panel>
  );
};
