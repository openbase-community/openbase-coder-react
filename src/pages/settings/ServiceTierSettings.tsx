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
  type ServiceTier,
  type ServiceTierSettingsResponse,
} from "./settingsApi";

const SCOPES = [
  {
    key: "dispatcher_service_tier" as const,
    label: "Voice dispatcher",
    detail: "Latency-sensitive dispatch turns. Fast is recommended.",
  },
  {
    key: "super_agents_service_tier" as const,
    label: "Super Agents",
    detail:
      "Bulk agent work. Standard by default; fast if you prefer speed everywhere.",
  },
];

type ScopeKey = (typeof SCOPES)[number]["key"];

export const ServiceTierSettings: React.FC = () => {
  const [settings, setSettings] = useState<ServiceTierSettingsResponse | null>(
    null,
  );
  const [tiers, setTiers] = useState<Record<ScopeKey, ServiceTier | "">>({
    dispatcher_service_tier: "",
    super_agents_service_tier: "",
  });
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
      setTiers({
        dispatcher_service_tier: data.dispatcher_service_tier,
        super_agents_service_tier: data.super_agents_service_tier,
      });
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
    if (!tiers.dispatcher_service_tier || !tiers.super_agents_service_tier) {
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiFetch("/api/settings/service-tier/", {
        method: "PUT",
        body: JSON.stringify(tiers),
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
      setTiers({
        dispatcher_service_tier: data.dispatcher_service_tier,
        super_agents_service_tier: data.super_agents_service_tier,
      });
      setMessage(data.restart_required ? data.restart_hint : null);
    } catch {
      setError("Unable to reach the local API.");
    }
    setSaving(false);
  }, [tiers]);

  const dirty =
    Boolean(settings) &&
    (tiers.dispatcher_service_tier !== settings?.dispatcher_service_tier ||
      tiers.super_agents_service_tier !== settings?.super_agents_service_tier);
  const canSave =
    dirty &&
    Boolean(tiers.dispatcher_service_tier) &&
    Boolean(tiers.super_agents_service_tier) &&
    !loading &&
    !saving;

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium text-foreground">
              Fast mode
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Speed tier per lane, applied to Codex, Openbase Cloud, and Claude
              turns (Claude maps tiers to effort lanes).
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
              title="Refresh service tiers"
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
        {SCOPES.map((scope) => (
          <div
            key={scope.key}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-foreground">
                {scope.label}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {scope.detail}
              </p>
            </div>
            <Select
              value={tiers[scope.key]}
              onValueChange={(value) => {
                setTiers((prev) => ({
                  ...prev,
                  [scope.key]: value as ServiceTier,
                }));
                setMessage(null);
                setError(null);
              }}
              disabled={loading || saving}
            >
              <SelectTrigger className="h-8 w-full min-w-0 text-[12px] sm:w-[190px]">
                <SelectValue
                  placeholder={loading ? "Loading..." : "Service tier"}
                />
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
        ))}
      </div>
    </div>
  );
};
