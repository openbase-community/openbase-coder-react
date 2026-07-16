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
  const [userAddressName, setUserAddressName] = useState("");
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
      setUserAddressName(data.user_address_name);
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
  const normalizedUserAddressName = userAddressName.trim();
  const changed = useMemo(
    () =>
      Boolean(settings) &&
      (normalizedPhrase !== settings?.dangerous_confirmation_phrase ||
        normalizedUserAddressName !== settings?.user_address_name),
    [normalizedPhrase, normalizedUserAddressName, settings],
  );

  const saveSettings = useCallback(async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings/dangerous-confirmation/", {
        method: "PATCH",
        body: JSON.stringify({
          dangerous_confirmation_phrase: normalizedPhrase,
          user_address_name: normalizedUserAddressName,
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
      setUserAddressName(data.user_address_name);
      setError(null);
    } catch {
      setError("Unable to reach the local API.");
    }
    setSaving(false);
  }, [normalizedPhrase, normalizedUserAddressName]);

  const resetToDefault = useCallback(() => {
    if (!settings) {
      return;
    }
    setPhrase(settings.default_dangerous_confirmation_phrase);
    setUserAddressName(settings.default_user_address_name);
  }, [settings]);

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="border-b border-border px-3 py-2.5">
        <p className="text-[12.5px] font-medium text-foreground">
          Risky action confirmation
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Template values used in installed agent instructions.
        </p>
      </div>
      <div className="space-y-2 px-3 py-3">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="min-w-0 space-y-1">
            <span className="block text-[11px] font-medium text-muted-foreground">
              Confirmation phrase
            </span>
            <Input
              className="h-8 min-w-0 px-2.5 text-[12px]"
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              disabled={loading || saving}
            />
          </label>
          <label className="min-w-0 space-y-1">
            <span className="block text-[11px] font-medium text-muted-foreground">
              User address
            </span>
            <Input
              className="h-8 min-w-0 px-2.5 text-[12px]"
              value={userAddressName}
              onChange={(event) => setUserAddressName(event.target.value)}
              disabled={loading || saving}
            />
          </label>
          <div className="flex shrink-0 items-end gap-2">
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
              disabled={
                loading ||
                saving ||
                !changed ||
                normalizedPhrase.length === 0 ||
                normalizedUserAddressName.length === 0
              }
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
