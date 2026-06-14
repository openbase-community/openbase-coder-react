import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Save } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  extractErrorMessage,
  type CodingBackendSettingsResponse,
} from "./settingsApi";

export const CodingBackendSettings: React.FC = () => {
  const [settings, setSettings] = useState<CodingBackendSettingsResponse | null>(
    null,
  );
  const [selectedBackend, setSelectedBackend] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/settings/coding-backend/");
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to load coding backend: ${res.status}`,
          ),
        );
        setLoading(false);
        return;
      }
      const data = (await res.json()) as CodingBackendSettingsResponse;
      const supportedIds = new Set(data.supported_backends.map((option) => option.id));
      setSettings(data);
      setSelectedBackend(supportedIds.has(data.backend) ? data.backend : "");
      setMessage(null);
      setError(
        supportedIds.has(data.backend)
          ? null
          : `Unsupported current backend: ${data.backend}`,
      );
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
      settings?.supported_backends.find(
        (option) => option.id === selectedBackend,
      ) ?? null,
    [selectedBackend, settings],
  );

  const saveBackend = useCallback(async () => {
    if (!selectedBackend) {
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiFetch("/api/settings/coding-backend/", {
        method: "PUT",
        body: JSON.stringify({ backend: selectedBackend }),
      });
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to save coding backend: ${res.status}`,
          ),
        );
        setSaving(false);
        return;
      }
      const data = (await res.json()) as CodingBackendSettingsResponse;
      setSettings(data);
      setSelectedBackend(data.backend);
      setMessage(
        data.restart_required ? `Backend saved. ${data.restart_hint}` : null,
      );
    } catch {
      setError("Unable to reach the local API.");
    }
    setSaving(false);
  }, [selectedBackend]);

  const currentOption = settings?.supported_backends.find(
    (option) => option.id === settings.backend,
  );
  const canSave =
    Boolean(selectedBackend) &&
    Boolean(settings) &&
    selectedBackend !== settings?.backend &&
    !loading &&
    !saving;

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border px-3 py-2.5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Coding backend
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Select the backend used for Super Agents coding sessions.
          </p>
          {settings ? (
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              Current: {currentOption?.label ?? settings.backend}
            </p>
          ) : null}
          {selectedOption ? (
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {selectedOption.summary} {selectedOption.description}
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
            value={selectedBackend}
            onValueChange={(value) => {
              setSelectedBackend(value);
              setMessage(null);
              setError(null);
            }}
            disabled={loading || saving}
          >
            <SelectTrigger className="h-8 min-w-0 text-[12px] sm:w-56">
              <SelectValue
                placeholder={loading ? "Loading…" : "Select backend"}
              />
            </SelectTrigger>
            <SelectContent>
              {settings?.supported_backends.map((option) => (
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
            title="Refresh coding backend"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[12px]"
            onClick={() => {
              void saveBackend();
            }}
            disabled={!canSave}
          >
            <Save className="h-3 w-3" />
            {saving ? "Saving…" : "Save backend"}
          </Button>
        </div>
      </div>
    </div>
  );
};
