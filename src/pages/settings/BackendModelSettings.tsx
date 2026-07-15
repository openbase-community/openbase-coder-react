import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  type BackendModelSettingsResponse,
} from "./settingsApi";

type ModelRole = "dispatcher" | "super_agents";

const MODEL_ROLES: Array<{
  role: ModelRole;
  label: string;
  description: string;
}> = [
  {
    role: "dispatcher",
    label: "Dispatcher model",
    description: "Select the model alias used for dispatcher turns.",
  },
  {
    role: "super_agents",
    label: "Super Agents model",
    description: "Select the model alias used for Super Agents turns.",
  },
];

const emptyModels: Record<ModelRole, string> = {
  dispatcher: "",
  super_agents: "",
};

export const BackendModelSettings: React.FC = () => {
  const [settings, setSettings] = useState<BackendModelSettingsResponse | null>(
    null,
  );
  const [models, setModels] =
    useState<Record<ModelRole, string>>(emptyModels);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<ModelRole | null>(null);
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
      setModels({
        dispatcher: data.models.dispatcher ?? "",
        super_agents: data.models.super_agents ?? "",
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

  const saveSetting = useCallback(
    async (role: ModelRole) => {
      const model = models[role].trim();
      if (!model) {
        return;
      }
      setSavingRole(role);
      setMessage(null);
      setError(null);
      try {
        const res = await apiFetch("/api/settings/backend-model/", {
          method: "PUT",
          body: JSON.stringify({ role, model }),
        });
        if (!res.ok) {
          setError(
            await extractErrorMessage(
              res,
              `Unable to save model settings: ${res.status}`,
            ),
          );
          setSavingRole(null);
          return;
        }
        const data = (await res.json()) as BackendModelSettingsResponse;
        setSettings(data);
        setModels((current) => ({
          ...current,
          [role]: data.models[role] ?? "",
        }));
        const roleLabel = MODEL_ROLES.find((entry) => entry.role === role)?.label;
        setMessage(`${roleLabel ?? "Model"} saved. ${data.restart_hint}`);
      } catch {
        setError("Unable to reach the local API.");
      }
      setSavingRole(null);
    },
    [models],
  );

  const options = settings?.options ?? [];

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      {MODEL_ROLES.map(({ role, label, description }) => {
        const selectedOption = options.find(
          (option) => option.id === models[role],
        );
        const saving = savingRole === role;
        const canSave =
          Boolean(settings) &&
          Boolean(models[role].trim()) &&
          !loading &&
          savingRole === null &&
          models[role].trim() !== settings?.models[role];

        return (
          <div
            key={role}
            className="flex flex-col gap-3 border-b border-border px-3 py-2.5 last:border-b-0 lg:flex-row lg:items-center"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium text-foreground">{label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {description}
              </p>
              {settings ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Current: {settings.effective[role]}
                </p>
              ) : null}
              {selectedOption ? (
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  {selectedOption.description}
                </p>
              ) : null}
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              {settings?.allows_custom ? (
                <Input
                  value={models[role]}
                  onChange={(event) => {
                    setModels((current) => ({
                      ...current,
                      [role]: event.target.value,
                    }));
                    setMessage(null);
                    setError(null);
                  }}
                  aria-label={label}
                  placeholder={loading ? "Loading..." : "Model alias"}
                  className="h-8 min-w-0 text-[12px] sm:w-56"
                  disabled={loading || savingRole !== null}
                />
              ) : (
                <Select
                  value={models[role]}
                  onValueChange={(value) => {
                    setModels((current) => ({ ...current, [role]: value }));
                    setMessage(null);
                    setError(null);
                  }}
                  disabled={loading || savingRole !== null || options.length === 0}
                >
                  <SelectTrigger
                    className="h-8 min-w-0 text-[12px] sm:w-56"
                    aria-label={label}
                  >
                    <SelectValue
                      placeholder={loading ? "Loading..." : "Select model"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-[12px]"
                onClick={() => {
                  void saveSetting(role);
                }}
                disabled={!canSave}
              >
                <Save className="h-3 w-3" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        );
      })}
      <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          {message ? (
            <p className="text-[12px] text-success">{message}</p>
          ) : null}
          {error ? (
            <p className="text-[12px] text-destructive">{error}</p>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-[12px]"
          onClick={() => {
            void fetchSettings();
          }}
          disabled={loading || savingRole !== null}
          title="Refresh model settings"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
};
