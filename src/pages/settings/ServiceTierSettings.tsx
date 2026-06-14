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
  type CodexServiceTier,
  type ServiceTierSettingsResponse,
} from "./settingsApi";

export const ServiceTierSettings: React.FC = () => {
  const [settings, setSettings] = useState<ServiceTierSettingsResponse | null>(
    null,
  );
  const [serviceTier, setServiceTier] = useState<CodexServiceTier | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/settings/service-tier/");
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to load service tier: ${res.status}`,
          ),
        );
        setLoading(false);
        return;
      }
      const data = (await res.json()) as ServiceTierSettingsResponse;
      setSettings(data);
      setServiceTier(data.codex_service_tier);
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
    if (!serviceTier) {
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiFetch("/api/settings/service-tier/", {
        method: "PUT",
        body: JSON.stringify({ codex_service_tier: serviceTier }),
      });
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to save service tier: ${res.status}`,
          ),
        );
        setSaving(false);
        return;
      }
      const data = (await res.json()) as ServiceTierSettingsResponse;
      setSettings(data);
      setServiceTier(data.codex_service_tier);
      setMessage(data.restart_required ? data.restart_hint : null);
    } catch {
      setError("Unable to reach the local API.");
    }
    setSaving(false);
  }, [serviceTier]);

  const selectedOption =
    settings?.options.find((option) => option.id === serviceTier) ?? null;
  const canSave =
    Boolean(settings) &&
    Boolean(serviceTier) &&
    serviceTier !== settings?.codex_service_tier &&
    !loading &&
    !saving;

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border px-3 py-2.5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Codex service tier
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Select the speed tier used for Codex and Openbase Cloud turns.
          </p>
          {settings ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Current: {selectedOption?.label ?? settings.effective.codex_service_tier}
            </p>
          ) : null}
          {message ? (
            <p className="mt-1 text-[12px] text-success">{message}</p>
          ) : null}
          {error ? (
            <p className="mt-1 text-[12px] text-destructive">{error}</p>
          ) : null}
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-[190px_auto_auto]">
          <Select
            value={serviceTier}
            onValueChange={(value) => {
              setServiceTier(value as CodexServiceTier);
              setMessage(null);
              setError(null);
            }}
            disabled={loading || saving}
          >
            <SelectTrigger className="h-8 min-w-0 text-[12px]">
              <SelectValue placeholder={loading ? "Loading..." : "Service tier"} />
            </SelectTrigger>
            <SelectContent>
              {settings?.options.map((option) => (
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
            title="Refresh service tier"
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
