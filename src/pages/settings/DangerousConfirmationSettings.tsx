import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { RotateCcw, Save } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  extractErrorMessage,
  type DangerousConfirmationSettingsResponse,
} from "./settingsApi";

export const DangerousConfirmationSettings: React.FC = () => {
  const [settings, setSettings] =
    useState<DangerousConfirmationSettingsResponse | null>(null);
  const [phrase, setPhrase] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/settings/dangerous-confirmation/");
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to load confirmation settings: ${res.status}`,
          ),
        );
        setLoading(false);
        return;
      }
      const data = (await res.json()) as DangerousConfirmationSettingsResponse;
      setSettings(data);
      setPhrase(data.dangerous_confirmation_phrase);
      setError(null);
    } catch {
      setError("Unable to reach the local API.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const normalizedPhrase = phrase.trim();
  const changed = useMemo(
    () =>
      Boolean(settings) &&
      normalizedPhrase !== settings?.dangerous_confirmation_phrase,
    [normalizedPhrase, settings],
  );

  const saveSettings = useCallback(async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings/dangerous-confirmation/", {
        method: "PATCH",
        body: JSON.stringify({
          dangerous_confirmation_phrase: normalizedPhrase,
        }),
      });
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to save confirmation settings: ${res.status}`,
          ),
        );
        setSaving(false);
        return;
      }
      const data = (await res.json()) as DangerousConfirmationSettingsResponse;
      setSettings(data);
      setPhrase(data.dangerous_confirmation_phrase);
      setError(null);
    } catch {
      setError("Unable to reach the local API.");
    }
    setSaving(false);
  }, [normalizedPhrase]);

  const resetToDefault = useCallback(() => {
    if (!settings) {
      return;
    }
    setPhrase(settings.default_dangerous_confirmation_phrase);
  }, [settings]);

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="border-b border-border px-3 py-2.5">
        <p className="text-[12.5px] font-medium text-foreground">
          Risky action confirmation
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Exact phrase agents require before destructive or public publishing actions.
        </p>
      </div>
      <div className="space-y-2 px-3 py-3">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <Input
            className="h-8 min-w-0 flex-1 px-2.5 text-[12px]"
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
            disabled={loading || saving}
          />
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-[12px]"
              onClick={resetToDefault}
              disabled={loading || saving || !settings}
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
            <Button
              size="sm"
              className="h-8 px-2.5 text-[12px]"
              onClick={() => {
                void saveSettings();
              }}
              disabled={loading || saving || !changed || normalizedPhrase.length === 0}
            >
              <Save className="h-3 w-3" />
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
        {error ? <p className="text-[12px] text-destructive">{error}</p> : null}
      </div>
    </div>
  );
};
