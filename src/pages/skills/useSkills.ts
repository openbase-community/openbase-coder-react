import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type {
  AutoLinkSettings,
  AutoLinkSyncResult,
  SkillEntry,
  SkillSection,
} from "./types";

export interface UseSkillsResult {
  skills: SkillEntry[];
  sections: SkillSection[];
  skillsDir: string;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  listError: string | null;
  newName: string;
  setNewName: (name: string) => void;
  syncingSkill: string;
  autoLinkSettings: AutoLinkSettings | null;
  autoLinkSync: AutoLinkSyncResult | null;
  savingAutoLink: boolean;
  fetchSkills: () => Promise<void>;
  createSkill: () => Promise<void>;
  linkSkill: (
    skill: SkillEntry,
    sourceScope: string,
    targetScope: string,
  ) => Promise<void>;
  updateAutoLinkSetting: (enabled: boolean) => Promise<void>;
  runAutoLinkSync: () => Promise<void>;
}

/**
 * Owns the installed-skills list data plus the auto-link personal-skills
 * settings and their mutations. `openSkill` is invoked after a successful
 * create so the caller can navigate to the new skill.
 */
export function useSkills(
  listApiParams: string,
  openSkill: (name: string, scope?: string) => void,
): UseSkillsResult {
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [sections, setSections] = useState<SkillSection[]>([]);
  const [skillsDir, setSkillsDir] = useState("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [syncingSkill, setSyncingSkill] = useState("");
  const [autoLinkSettings, setAutoLinkSettings] =
    useState<AutoLinkSettings | null>(null);
  const [autoLinkSync, setAutoLinkSync] = useState<AutoLinkSyncResult | null>(
    null,
  );
  const [savingAutoLink, setSavingAutoLink] = useState(false);

  const fetchSkills = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/skills/${listApiParams}`);
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Failed to load skills"));
      }
      const data = await res.json();
      setSkills(data.skills);
      setSections(data.sections ?? []);
      setSkillsDir(data.skills_dir);
      setAutoLinkSettings(data.auto_link_personal_skills ?? null);
      setAutoLinkSync(data.auto_link_personal_skills_sync ?? null);
      setListError(null);
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : "Unable to reach the local API.",
      );
    }
    setLoading(false);
  }, [listApiParams]);

  useEffect(() => {
    void fetchSkills();
  }, [fetchSkills]);

  const createSkill = useCallback(async () => {
    const trimmed = newName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!trimmed) return;
    try {
      const res = await apiFetch(`/api/skills/${listApiParams}`, {
        method: "POST",
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Failed to create skill"));
      }
      setNewName("");
      await fetchSkills();
      openSkill(trimmed);
      toast.success(`Skill '${trimmed}' created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create skill");
    }
  }, [newName, listApiParams, fetchSkills, openSkill]);

  const linkSkill = useCallback(
    async (skill: SkillEntry, sourceScope: string, targetScope: string) => {
      const operationId = `${sourceScope}:${targetScope}:${skill.name}`;
      setSyncingSkill(operationId);
      try {
        const res = await apiFetch("/api/skills/symlink/", {
          method: "POST",
          body: JSON.stringify({
            name: skill.name,
            source_scope: sourceScope,
            target_scope: targetScope,
          }),
        });
        if (!res.ok) {
          throw new Error(await extractErrorMessage(res, "Failed to link skill"));
        }
        const data = await res.json();
        await fetchSkills();
        toast.success(
          data.created
            ? `Linked /${skill.name}`
            : `/${skill.name} was already linked`,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to link skill");
      }
      setSyncingSkill("");
    },
    [fetchSkills],
  );

  const updateAutoLinkSetting = useCallback(
    async (enabled: boolean) => {
      setSavingAutoLink(true);
      try {
        const res = await apiFetch("/api/skills/auto-link-personal/", {
          method: "PATCH",
          body: JSON.stringify({ auto_link_personal_skills: enabled }),
        });
        if (!res.ok) {
          throw new Error(
            await extractErrorMessage(res, "Failed to update auto-link setting"),
          );
        }
        const data = await res.json();
        setAutoLinkSettings(data);
        setAutoLinkSync(data.sync ?? null);
        await fetchSkills();
        if (enabled) {
          const sync = data.sync as AutoLinkSyncResult | null;
          toast.success(
            sync?.created
              ? `Auto-linked ${sync.created} skill${sync.created === 1 ? "" : "s"}`
              : "Auto-link is enabled",
          );
        } else {
          toast.success("Auto-link is disabled");
        }
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to update auto-link setting",
        );
      }
      setSavingAutoLink(false);
    },
    [fetchSkills],
  );

  const runAutoLinkSync = useCallback(async () => {
    setSavingAutoLink(true);
    try {
      const res = await apiFetch("/api/skills/auto-link-personal/", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Failed to scan personal skills"),
        );
      }
      const data = await res.json();
      setAutoLinkSettings(data);
      setAutoLinkSync(data.sync ?? null);
      await fetchSkills();
      const sync = data.sync as AutoLinkSyncResult | null;
      toast.success(
        sync?.created
          ? `Auto-linked ${sync.created} skill${sync.created === 1 ? "" : "s"}`
          : "Auto-link scan complete",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to scan personal skills",
      );
    }
    setSavingAutoLink(false);
  }, [fetchSkills]);

  return {
    skills,
    sections,
    skillsDir,
    loading,
    setLoading,
    listError,
    newName,
    setNewName,
    syncingSkill,
    autoLinkSettings,
    autoLinkSync,
    savingAutoLink,
    fetchSkills,
    createSkill,
    linkSkill,
    updateAutoLinkSetting,
    runAutoLinkSync,
  };
}
