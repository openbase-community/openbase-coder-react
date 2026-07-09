import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  extractErrorMessage,
  type EnvSettingsEntry,
  type EnvSettingsResponse,
} from "./settingsApi";

type EditableEnvEntry = EnvSettingsEntry & {
  id: string;
  originalKey: string;
};

const newEntry = (): EditableEnvEntry => ({
  id: crypto.randomUUID(),
  key: "",
  originalKey: "",
  value: "",
  secret: false,
});

const isSecretKey = (key: string) =>
  ["KEY", "SECRET", "TOKEN", "PASSWORD"].some((part) => key.includes(part));

const MANAGED_ENV_KEYS = new Set([
  "OPENBASE_CODING_BACKEND",
  "CODEX_MODEL",
  "OPENBASE_CLOUD_CODEX_MODEL",
  "CODEX_MODEL_REASONING_EFFORT",
  "CODEX_SERVICE_TIER",
  "DISPATCHER_SERVICE_TIER",
  "SUPER_AGENTS_SERVICE_TIER",
]);

export const EnvSettings: React.FC = () => {
  const [settings, setSettings] = useState<EnvSettingsResponse | null>(null);
  const [entries, setEntries] = useState<EditableEnvEntry[]>([]);
  const [deletedKeys, setDeletedKeys] = useState<string[]>([]);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/settings/env/");
      if (!res.ok) {
        setError(
          await extractErrorMessage(res, `Unable to load env settings: ${res.status}`),
        );
        setLoading(false);
        return;
      }
      const data = (await res.json()) as EnvSettingsResponse;
      setSettings(data);
      setEntries(
        data.entries.map((entry) => ({
          ...entry,
          id: entry.key,
          originalKey: entry.key,
        })),
      );
      setDeletedKeys([]);
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

  const existingKeys = useMemo(
    () => new Set(entries.map((entry) => entry.key).filter(Boolean)),
    [entries],
  );
  const availableCommonKeys = (settings?.common_keys ?? []).filter(
    (key) => !MANAGED_ENV_KEYS.has(key) && !existingKeys.has(key),
  );
  const visibleEntries = entries.filter(
    (entry) => !MANAGED_ENV_KEYS.has(entry.originalKey.trim().toUpperCase()),
  );

  const updateEntry = (id: string, patch: Partial<EditableEnvEntry>) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              ...patch,
              secret:
                patch.key !== undefined
                  ? isSecretKey(patch.key.toUpperCase())
                  : entry.secret,
            }
          : entry,
      ),
    );
  };

  const removeEntry = (entry: EditableEnvEntry) => {
    if (entry.originalKey) {
      setDeletedKeys((current) =>
        Array.from(new Set([...current, entry.originalKey])),
      );
    }
    setEntries((current) => current.filter((candidate) => candidate.id !== entry.id));
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    const payloadEntries = entries
      .map((entry) => ({
        key: entry.key.trim().toUpperCase(),
        value: entry.value,
      }))
      .filter((entry) => entry.key);
    const renamedKeys = entries
      .filter(
        (entry) =>
          entry.originalKey && entry.originalKey !== entry.key.trim().toUpperCase(),
      )
      .map((entry) => entry.originalKey);
    try {
      const res = await apiFetch("/api/settings/env/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: payloadEntries,
          deleted_keys: Array.from(new Set([...deletedKeys, ...renamedKeys])),
        }),
      });
      if (!res.ok) {
        setError(
          await extractErrorMessage(res, `Unable to save env settings: ${res.status}`),
        );
        setSaving(false);
        return;
      }
      const data = (await res.json()) as EnvSettingsResponse;
      setSettings(data);
      setEntries(
        data.entries.map((entry) => ({
          ...entry,
          id: entry.key,
          originalKey: entry.key,
        })),
      );
      setDeletedKeys([]);
      setMessage("Saved. Restart Openbase services for environment changes to apply.");
    } catch {
      setError("Unable to reach the local API.");
    }
    setSaving(false);
  }, [deletedKeys, entries]);

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border px-3 py-2.5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Environment variables
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Edit advanced runtime values loaded by the local Openbase services.
          </p>
          {message ? <p className="mt-1 text-[12px] text-success">{message}</p> : null}
          {error ? <p className="mt-1 text-[12px] text-destructive">{error}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[12px]"
            onClick={() => setEntries((current) => [...current, newEntry()])}
            disabled={loading || saving}
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[12px]"
            onClick={() => {
              void handleSave();
            }}
            disabled={loading || saving}
          >
            <Save className="h-3 w-3" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
      <div className="space-y-2 px-3 py-2.5">
        {loading ? (
          <p className="text-[12px] text-muted-foreground">Loading…</p>
        ) : visibleEntries.length ? (
          visibleEntries.map((entry) => {
            const secretVisible = visibleSecrets.has(entry.id);
            return (
              <div
                key={entry.id}
                className="grid gap-2 sm:grid-cols-[minmax(180px,240px)_minmax(0,1fr)_auto_auto]"
              >
                <Input
                  value={entry.key}
                  onChange={(event) =>
                    updateEntry(entry.id, {
                      key: event.target.value.toUpperCase(),
                    })
                  }
                  list="openbase-env-common-keys"
                  placeholder="ENV_KEY"
                  className="h-8 font-mono text-[12px]"
                />
                <Input
                  value={entry.value}
                  type={entry.secret && !secretVisible ? "password" : "text"}
                  onChange={(event) =>
                    updateEntry(entry.id, { value: event.target.value })
                  }
                  placeholder="value"
                  className="h-8 font-mono text-[12px]"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setVisibleSecrets((current) => {
                      const next = new Set(current);
                      if (next.has(entry.id)) {
                        next.delete(entry.id);
                      } else {
                        next.add(entry.id);
                      }
                      return next;
                    })
                  }
                  disabled={!entry.secret}
                  aria-label={secretVisible ? "Hide value" : "Show value"}
                >
                  {secretVisible ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeEntry(entry)}
                  aria-label="Remove variable"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })
        ) : (
          <p className="text-[12px] text-muted-foreground">
            No advanced variables are set yet.
          </p>
        )}
        <datalist id="openbase-env-common-keys">
          {availableCommonKeys.map((key) => (
            <option key={key} value={key} />
          ))}
        </datalist>
      </div>
    </div>
  );
};
