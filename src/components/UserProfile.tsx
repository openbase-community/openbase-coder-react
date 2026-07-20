import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import type { KeepAwakeSettingsResponse } from "@/pages/settings/settingsApi";
import { LogOut, Settings, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const UserProfile = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
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
        body: JSON.stringify({ keep_system_awake: checked }),
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

  const keepAwakeEnabled = settings?.keep_system_awake ?? false;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-xl border border-border/60 bg-white/70 p-0 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.85)] hover:bg-white hover:ring-0"
          title={
            keepAwakeEnabled
              ? "Mac sleep prevention is on"
              : "Mac sleep is allowed"
          }
        >
          <Avatar className="h-8 w-8 rounded-[10px]">
            <AvatarFallback className="rounded-[10px] bg-primary/[0.08] text-primary">
              <UserRound className="h-4 w-4" strokeWidth={1.8} />
            </AvatarFallback>
          </Avatar>
          {keepAwakeEnabled ? (
            <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border-2 border-white bg-success" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-72 text-[13px]">
        <DropdownMenuLabel className="px-2 py-1.5 text-[12px]">
          Mac sleep prevention
        </DropdownMenuLabel>
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-foreground">
              {keepAwakeEnabled ? "Keep awake" : "Sleep allowed"}
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
              Runs caffeinate -i -d when the server starts. Restart services to
              apply changes.
            </p>
          </div>
          <Switch
            checked={keepAwakeEnabled}
            disabled={loading || saving || !settings}
            onCheckedChange={(value) => void saveSettings(value)}
            aria-label="Run caffeinate with the Openbase server"
          />
        </div>
        {error ? (
          <p className="px-2 pb-2 text-[11px] text-destructive">{error}</p>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
          <Settings className="mr-2 h-3.5 w-3.5" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfile;
