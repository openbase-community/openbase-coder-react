import { Button } from "@/components/ui/button";
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
  type ReasoningEffort,
  type ReasoningSettingsResponse,
} from "./settingsApi";

const effortLabels: Record<ReasoningEffort, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "Extra high",
};

export const ReasoningSettings: React.FC = () => {
  const [settings, setSettings] = useState<ReasoningSettingsResponse | null>(null);
  const [dispatcherEffort, setDispatcherEffort] = useState<ReasoningEffort | "">("");
  const [superAgentsEffort, setSuperAgentsEffort] = useState<ReasoningEffort | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/settings/reasoning/");
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to load reasoning settings: ${res.status}`,
          ),
        );
        setLoading(false);
        return;
      }
      const data = (await res.json()) as ReasoningSettingsResponse;
      setSettings(data);
      setDispatcherEffort(data.dispatcher_reasoning_effort ?? "");
      setSuperAgentsEffort(data.super_agents_reasoning_effort ?? "");
      setMessage(null);
      setError(null);
    } catch {
      setError("Unable to reach the local API.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const saveSettings = useCallback(async () => {
    if (!dispatcherEffort || !superAgentsEffort) {
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiFetch("/api/settings/reasoning/", {
        method: "PUT",
        body: JSON.stringify({
          dispatcher_reasoning_effort: dispatcherEffort,
          super_agents_reasoning_effort: superAgentsEffort,
        }),
      });
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to save reasoning settings: ${res.status}`,
          ),
        );
        setSaving(false);
        return;
      }
      const data = (await res.json()) as ReasoningSettingsResponse;
      setSettings(data);
      setDispatcherEffort(data.dispatcher_reasoning_effort ?? "");
      setSuperAgentsEffort(data.super_agents_reasoning_effort ?? "");
      setMessage(data.restart_hint);
    } catch {
      setError("Unable to reach the local API.");
    }
    setSaving(false);
  }, [dispatcherEffort, superAgentsEffort]);

  const options = settings?.options ?? [];
  const canSave =
    Boolean(settings) &&
    Boolean(dispatcherEffort) &&
    Boolean(superAgentsEffort) &&
    !loading &&
    !saving &&
    (dispatcherEffort !== settings?.dispatcher_reasoning_effort ||
      superAgentsEffort !== settings?.super_agents_reasoning_effort);

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border px-3 py-2.5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Reasoning levels
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Set reasoning effort for dispatcher and Super Agent turns.
          </p>
          {settings ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Current: dispatcher {settings.effective.dispatcher_reasoning_effort},
              Super Agents {settings.effective.super_agents_reasoning_effort}
            </p>
          ) : null}
          {message ? (
            <p className="mt-1 text-[12px] text-success">{message}</p>
          ) : null}
          {error ? (
            <p className="mt-1 text-[12px] text-destructive">{error}</p>
          ) : null}
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-[150px_150px_auto_auto]">
          <Select
            value={dispatcherEffort}
            onValueChange={(value) => {
              setDispatcherEffort(value as ReasoningEffort);
              setMessage(null);
              setError(null);
            }}
            disabled={loading || saving}
          >
            <SelectTrigger className="h-8 min-w-0 text-[12px]">
              <SelectValue
                placeholder={loading ? "Loading…" : "Dispatcher"}
              />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  Dispatcher: {effortLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={superAgentsEffort}
            onValueChange={(value) => {
              setSuperAgentsEffort(value as ReasoningEffort);
              setMessage(null);
              setError(null);
            }}
            disabled={loading || saving}
          >
            <SelectTrigger className="h-8 min-w-0 text-[12px]">
              <SelectValue
                placeholder={loading ? "Loading…" : "Super Agents"}
              />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  Super Agents: {effortLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[12px]"
            onClick={() => {
              void fetchSettings();
            }}
            disabled={loading || saving}
            title="Refresh reasoning levels"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
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
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
};
