import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api";
import React, { useCallback, useEffect, useState } from "react";
import {
  extractErrorMessage,
  type KeepAwakeSettingsResponse,
} from "./settingsApi";

export const KeepAwakeSettings: React.FC = () => {
  const [settings, setSettings] = useState<KeepAwakeSettingsResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/settings/keep-awake/");
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to load keep-awake settings: ${res.status}`,
          ),
        );
        setLoading(false);
        return;
      }
      setSettings((await res.json()) as KeepAwakeSettingsResponse);
      setError(null);
    } catch {
      setError("Unable to reach the local API.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const saveSettings = useCallback(async (checked: boolean) => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings/keep-awake/", {
        method: "PATCH",
        body: JSON.stringify({
          keep_system_awake: checked,
        }),
      });
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to save keep-awake settings: ${res.status}`,
          ),
        );
        setSaving(false);
        return;
      }
      setSettings((await res.json()) as KeepAwakeSettingsResponse);
      setError(null);
    } catch {
      setError("Unable to reach the local API.");
    }
    setSaving(false);
  }, []);

  const checked = settings?.keep_system_awake ?? false;

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Keep Mac awake
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Start caffeinate -i -d with the Openbase Coder server.
          </p>
          {settings?.restart_required ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {settings.restart_hint}
            </p>
          ) : null}
        </div>
        <Switch
          checked={checked}
          disabled={loading || saving || !settings}
          onCheckedChange={(value) => {
            void saveSettings(value);
          }}
          aria-label="Keep Mac awake while Openbase Coder server is running"
        />
      </div>
      {error ? (
        <p className="border-t border-border px-3 py-2 text-[12px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
};
