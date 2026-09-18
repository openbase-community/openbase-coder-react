import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

interface SharingSettings {
  auto_link_personal_skills: boolean;
  sync_skills_across_devices: boolean;
  device_sync_enabled: boolean;
  warnings: string[];
  link_result?: { conflicts: number; errors: number } | null;
}

type Preference = "auto_link_personal_skills" | "sync_skills_across_devices";

const preferences: Array<{ key: Preference; label: string; description: string }> = [
  {
    key: "auto_link_personal_skills",
    label: "Symlink my skills across backends (Codex/Claude Code)",
    description:
      "Add missing links so both backends can use your skills. Existing skills are never replaced. Turning this off leaves existing links in place.",
  },
  {
    key: "sync_skills_across_devices",
    label: "Sync my skills across devices",
    description:
      "Share personal skills with your paired computers. Turning this off keeps your files on every device and leaves unrelated folder sync unchanged.",
  },
];

export function SkillSharingSettings() {
  const [searchParams] = useSearchParams();
  const sectionRef = useRef<HTMLElement>(null);
  const focusSkills = searchParams.get("focus") === "skills";
  const [settings, setSettings] = useState<SharingSettings | null>(null);
  const loaded = settings !== null;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await apiFetch("/api/skills/settings/");
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Unable to load skill settings"));
      }
      setSettings(await response.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load skill settings");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (focusSkills && loaded) {
      sectionRef.current?.scrollIntoView({ block: "start" });
      sectionRef.current?.focus({ preventScroll: true });
    }
  }, [focusSkills, loaded]);

  const update = async (key: Preference, enabled: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiFetch("/api/skills/settings/", {
        method: "PATCH",
        body: JSON.stringify({ [key]: enabled }),
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Unable to save skill settings"));
      }
      setSettings(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save skill settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section ref={sectionRef} tabIndex={-1} aria-label="Skill sharing settings" className="scroll-mt-4 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <Panel>
      <div className="border-b border-border px-3 py-2.5">
        <h3 className="text-[12.5px] font-medium text-foreground">Skills</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Share your skills between backends and computers.
        </p>
      </div>
      {error ? (
        <div role="alert" className="px-3 py-2 text-[12px] text-destructive">
          {error}
          {!settings ? <Button variant="link" size="sm" onClick={() => void load()}>Retry</Button> : null}
        </div>
      ) : null}
      {!settings && !error ? <p className="px-3 py-3 text-[12px] text-muted-foreground">Loading skill settings…</p> : null}
      {settings ? (
        <div className="divide-y divide-border">
          {preferences.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between gap-4 px-3 py-3">
              <div className="min-w-0">
                <label htmlFor={key} className="text-[12.5px] font-medium text-foreground">{label}</label>
                <p id={`${key}-description`} className="mt-1 text-[12px] text-muted-foreground">{description}</p>
              </div>
              <Switch
                id={key}
                aria-describedby={`${key}-description`}
                checked={settings[key]}
                disabled={saving}
                onCheckedChange={(enabled) => void update(key, enabled)}
              />
            </div>
          ))}
          {settings.sync_skills_across_devices && !settings.device_sync_enabled ? (
            <p role="status" className="px-3 py-2 text-[12px] text-muted-foreground">
              Skill sharing is selected, but device sync is paused. <Link className="underline" to="/dashboard/sync">Open Sync</Link> to resume it.
            </p>
          ) : null}
          {settings.link_result && (settings.link_result.conflicts > 0 || settings.link_result.errors > 0) ? (
            <p role="status" className="px-3 py-2 text-[12px] text-warning">
              Some links could not be created. Existing skills were preserved. Review them on the Skills page.
            </p>
          ) : null}
          {settings.warnings.length > 0 ? (
            <ul className="px-6 py-2 text-[12px] text-warning">
              {settings.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Panel>
    </section>
  );
}
