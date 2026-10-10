import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { apiFetch } from "@/lib/api";
import type { VoiceModelSettingsResponse } from "@/pages/settings/settingsApi";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export type VoiceBudget = {
  warning_id: string;
  low: boolean;
  shared: boolean;
  remaining_percent: number;
};
type VoiceModelState = {
  settings: VoiceModelSettingsResponse | null;
  saving: boolean;
  save: (model: string) => Promise<boolean>;
  refresh: () => Promise<void>;
};
const VoiceModelContext = createContext<VoiceModelState | null>(null);
export const useVoiceModel = () => useContext(VoiceModelContext);
const seen = new Set<string>();

export function claimVoiceWarning(id: string): boolean {
  const key = `openbase.live-voice-warning.${id}`;
  if (seen.has(key)) return false;
  seen.add(key);
  try {
    if (window.localStorage.getItem(key)) return false;
    window.localStorage.setItem(key, "shown");
  } catch {
    // Private/blocked storage still gets once-per-session protection.
  }
  return true;
}

export function VoiceModelProvider({
  children,
  enabled,
}: {
  children: React.ReactNode;
  enabled: boolean;
}) {
  const [settings, setSettings] = useState<VoiceModelSettingsResponse | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState<VoiceBudget | null>(null);
  const revision = useRef(0);
  const savingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled || savingRef.current) return;
    const current = ++revision.current;
    try {
      const response = await apiFetch("/api/settings/voice-model/");
      if (!response.ok) return;
      const data = (await response.json()) as VoiceModelSettingsResponse;
      if (current !== revision.current) return;
      setSettings(data);
      if (data.model !== "gpt-live-1") {
        setWarning(null);
        return;
      }
      const usage = await apiFetch("/api/settings/voice-model/usage/");
      if (!usage.ok) return;
      const { model, budget } = (await usage.json()) as {
        model: string;
        budget: VoiceBudget | null;
      };
      if (current !== revision.current || model !== "gpt-live-1") return;
      if (budget && !budget.low) setWarning(null);
      if (
        budget?.low &&
        !document.hidden &&
        !document.querySelector(
          '[role="dialog"], [role="alertdialog"], [role="menu"]',
        ) &&
        claimVoiceWarning(budget.warning_id)
      )
        setWarning(budget);
    } catch {
      // Background usage outages leave the picker usable and retry next poll.
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 30_000);
    const visible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("openbase:voice-model-changed", visible);
    return () => {
      revision.current++;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("openbase:voice-model-changed", visible);
    };
  }, [refresh]);

  const save = async (model: string) => {
    if (savingRef.current) return false;
    revision.current++;
    savingRef.current = true;
    setSaving(true);
    try {
      const response = await apiFetch("/api/settings/voice-model/", {
        method: "PUT",
        body: JSON.stringify({ model }),
      });
      if (!response.ok)
        throw new Error("Unable to save voice model. Please try again.");
      setSettings((await response.json()) as VoiceModelSettingsResponse);
      if (model === "pipeline") setWarning(null);
      toast.success(
        model === "pipeline" ? "Classic voice selected" : "GPT Live selected",
        { description: "Applies to your next voice call." },
      );
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save voice model.",
      );
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <VoiceModelContext.Provider value={{ settings, saving, save, refresh }}>
      {children}
      <AlertDialog
        open={enabled && warning !== null}
        onOpenChange={(open) => {
          if (!open && !saving) setWarning(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>GPT Live allowance is running low</AlertDialogTitle>
          <AlertDialogDescription>
            You have 10% or less of your{" "}
            {warning?.shared ? "shared Cloud" : "GPT Live"} allowance left.{" "}
            Consider switching to the classic voice pipeline to reduce voice
            usage.
            {warning?.shared
              ? " Cloud speech providers also draw from this shared allowance."
              : ""}{" "}
            Your choice applies to the next call.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={saving}
              onClick={() => setWarning(null)}
            >
              Keep GPT Live
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(event) => {
                event.preventDefault();
                void save("pipeline");
              }}
            >
              {saving ? "Saving…" : "Switch to classic"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </VoiceModelContext.Provider>
  );
}
