import { ModelBadge } from "@/components/ModelBadge";
import { ProviderLogo } from "@/components/ProviderLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api";
import { modelProvider } from "@/lib/model-provider";
import type { BackendModelSettingsResponse } from "@/pages/settings/settingsApi";
import { AlertTriangle, Check, ChevronDown, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const SETTINGS_PATH = "/dashboard/settings?section=agents";

// Last response, shared across mounts so returning to the Dispatcher renders
// the configured default immediately instead of flashing the thread's
// last-run model while the request is in flight.
let cachedSettings: BackendModelSettingsResponse | null = null;

/**
 * Header control for the Dispatcher thread: shows the configured dispatcher
 * model and lets the user pick another. This writes the same global default
 * as Settings → Agents (there is no per-thread dispatcher model); the runtime
 * applies it after the dispatcher host restarts, so the save surfaces the
 * API's restart hint.
 */
export function DispatcherModelMenu() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<BackendModelSettingsResponse | null>(cachedSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async ({ quiet = false } = {}) => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/settings/backend-model/");
      if (!res.ok) throw new Error(`Unable to load model settings: ${res.status}`);
      const data = (await res.json()) as BackendModelSettingsResponse;
      cachedSettings = data;
      setSettings(data);
    } catch (caught) {
      if (!quiet) toast.error(caught instanceof Error ? caught.message : "Unable to load model settings");
    } finally {
      setLoading(false);
    }
  };

  // This control reflects the configured default (what the next dispatcher
  // session will use), not whatever model the current thread last ran on,
  // so fetch it up front rather than on first open.
  useEffect(() => {
    void load({ quiet: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (model: string) => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings/backend-model/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "dispatcher", model }),
      });
      if (!res.ok) throw new Error(`Unable to save model: ${res.status}`);
      const data = (await res.json()) as BackendModelSettingsResponse;
      cachedSettings = data;
      setSettings(data);
      const label = data.options.find((option) => option.id === model)?.label ?? model;
      toast.success(`Dispatcher model set to ${label}.`, {
        description: data.restart_required ? data.restart_hint : undefined,
      });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to save model");
    } finally {
      setSaving(false);
    }
  };

  const current = settings?.roles.dispatcher.model ?? settings?.models.dispatcher ?? null;
  const engine = settings?.roles.dispatcher.engine ?? null;
  const options = settings?.options ?? [];
  const currentOption = options.find((option) => option.id === current);
  // The configured model can be one this install cannot run (e.g. a Codex
  // model on a Claude-only setup); flag it instead of pretending it works.
  const currentUnavailable = currentOption?.available === false;

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) void load({ quiet: true }); }}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Dispatcher model"
          title={
            currentUnavailable
              ? `${currentOption?.unavailable_reason ?? "This model can't run on this install."} Turns fall back to the thread's last model.`
              : "Dispatcher model (default for all voice dispatch turns)"
          }
          className={`flex h-7 shrink-0 items-center gap-1 rounded px-1.5 transition-colors hover:bg-surface-muted ${
            currentUnavailable
              ? "text-warning hover:text-warning"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {current ? (
            <ModelBadge model={current} engine={engine} className="text-inherit" />
          ) : (
            <span className="text-[11px] text-muted-foreground/60">Model…</span>
          )}
          {currentUnavailable ? (
            <AlertTriangle className="h-3 w-3" aria-label="Model unavailable on this install" />
          ) : null}
          {saving ? (
            <LoaderCircle className="h-3 w-3 animate-spin" />
          ) : (
            <ChevronDown className="h-3 w-3 opacity-60" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
          Dispatcher model
        </DropdownMenuLabel>
        {loading && options.length === 0 ? (
          <DropdownMenuItem disabled className="gap-2 text-[12px]">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Loading…
          </DropdownMenuItem>
        ) : null}
        {options.map((option) => {
          const provider = modelProvider(option.id, option.engine);
          const selected = option.id === current;
          const unavailable = option.available === false;
          return (
            <DropdownMenuItem
              key={option.id}
              disabled={saving || unavailable}
              title={unavailable ? (option.unavailable_reason ?? "Unavailable on this install") : undefined}
              onSelect={() => { if (!selected) void save(option.id); }}
              className="gap-2 text-[12px]"
            >
              {provider ? (
                <ProviderLogo provider={provider} className="h-3.5 w-3.5" />
              ) : (
                <span className="h-3.5 w-3.5" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate">{option.label}</span>
                {unavailable && option.unavailable_reason ? (
                  <span className="block truncate text-[10.5px] text-muted-foreground">
                    {option.unavailable_reason}
                  </span>
                ) : null}
              </span>
              {selected ? <Check className="h-3.5 w-3.5" /> : null}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => navigate(SETTINGS_PATH)}
          className="text-[12px] text-muted-foreground"
        >
          All agent settings…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
