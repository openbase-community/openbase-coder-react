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
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  extractErrorMessage,
  type BackendModelSettingsResponse,
} from "./settingsApi";

export const BackendModelSettings: React.FC = () => {
  const [settings, setSettings] = useState<BackendModelSettingsResponse | null>(
    null,
  );
  const [superAgentsModel, setSuperAgentsModel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/settings/backend-model/");
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to load model settings: ${res.status}`,
          ),
        );
        setLoading(false);
        return;
      }
      const data = (await res.json()) as BackendModelSettingsResponse;
      setSettings(data);
      setSuperAgentsModel(data.models.super_agents ?? "");
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

  const selectedOption = useMemo(
    () =>
      settings?.options.find((option) => option.id === superAgentsModel) ?? null,
    [settings, superAgentsModel],
  );

  const saveSettings = useCallback(async () => {
    if (!superAgentsModel) {
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiFetch("/api/settings/backend-model/", {
        method: "PUT",
        body: JSON.stringify({
          role: "super_agents",
          model: superAgentsModel,
        }),
      });
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to save model settings: ${res.status}`,
          ),
        );
        setSaving(false);
        return;
      }
      const data = (await res.json()) as BackendModelSettingsResponse;
      setSettings(data);
      setSuperAgentsModel(data.models.super_agents ?? "");
      setMessage(data.restart_hint);
    } catch {
      setError("Unable to reach the local API.");
    }
    setSaving(false);
  }, [superAgentsModel]);

  const options = settings?.options ?? [];
  const canSave =
    Boolean(settings) &&
    Boolean(superAgentsModel) &&
    !loading &&
    !saving &&
    superAgentsModel !== settings?.models.super_agents;

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border px-3 py-2.5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Super Agents model
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Select the model alias used for new Super Agents turns.
          </p>
          {settings ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Current: {settings.effective.super_agents}
            </p>
          ) : null}
          {selectedOption ? (
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {selectedOption.description}
            </p>
          ) : null}
          {message ? (
            <p className="mt-1 text-[12px] text-success">{message}</p>
          ) : null}
          {error ? (
            <p className="mt-1 text-[12px] text-destructive">{error}</p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <Select
            value={superAgentsModel}
            onValueChange={(value) => {
              setSuperAgentsModel(value);
              setMessage(null);
              setError(null);
            }}
            disabled={loading || saving || options.length === 0}
          >
            <SelectTrigger className="h-8 min-w-0 text-[12px] sm:w-56">
              <SelectValue placeholder={loading ? "Loading..." : "Select model"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
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
            title="Refresh model settings"
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
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
};
