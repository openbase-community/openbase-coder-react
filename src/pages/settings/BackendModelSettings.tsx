import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
    label: "Dispatcher",
    description:
      "Backend and model for voice dispatch turns. Picking a model picks its engine.",
  },
  {
    role: "super_agents",
    label: "Default super agent",
    description:
      "Backend and model for super agents when a launch doesn't name one.",
  },
];

const ENGINE_LABELS: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
};

const emptyModels: Record<ModelRole, string> = {
  dispatcher: "",
  super_agents: "",
};

export const BackendModelSettings: React.FC = () => {
  const [settings, setSettings] = useState<BackendModelSettingsResponse | null>(
    null,
  );
  const [models, setModels] = useState<Record<ModelRole, string>>(emptyModels);
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
        dispatcher: data.roles?.dispatcher?.model ?? data.models.dispatcher ?? "",
        super_agents:
          data.roles?.super_agents?.model ?? data.models.super_agents ?? "",
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
          [role]: data.roles?.[role]?.model ?? data.models[role] ?? "",
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
  const engines = [...new Set(options.map((option) => option.engine))];

  return (
    <Panel>
      {MODEL_ROLES.map(({ role, label, description }) => {
        const selectedOption = options.find(
          (option) => option.id === models[role],
        );
        const saving = savingRole === role;
        const currentModel =
          settings?.roles?.[role]?.model ?? settings?.models[role] ?? null;
        const currentEngine = settings?.roles?.[role]?.engine ?? null;
        const canSave =
          Boolean(settings) &&
          Boolean(models[role].trim()) &&
          !loading &&
          savingRole === null &&
          models[role].trim() !== currentModel;

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
                  Current: {currentModel ?? "backend default"}
                  {currentEngine
                    ? ` (${ENGINE_LABELS[currentEngine] ?? currentEngine})`
                    : ""}
                </p>
              ) : null}
              {selectedOption ? (
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  {selectedOption.description}
                </p>
              ) : null}
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
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
                  className="h-8 min-w-0 text-[12px] sm:w-64"
                  aria-label={label}
                >
                  <SelectValue
                    placeholder={loading ? "Loading..." : "Select model"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {engines.map((engine) => (
                    <SelectGroup key={engine}>
                      <SelectLabel>
                        {ENGINE_LABELS[engine] ?? engine}
                      </SelectLabel>
                      {options
                        .filter((option) => option.engine === engine)
                        .map((option) => (
                          <SelectItem
                            key={option.id}
                            value={option.id}
                            disabled={!option.available}
                          >
                            {option.label}
                            {option.available ? "" : " (unavailable on Cloud)"}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
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
    </Panel>
  );
};
