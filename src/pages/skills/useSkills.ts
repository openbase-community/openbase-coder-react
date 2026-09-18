import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { SkillEntry, SkillSection } from "./types";

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
  fetchSkills: () => Promise<void>;
  createSkill: () => Promise<void>;
  linkSkill: (
    skill: SkillEntry,
    sourceScope: string,
    targetScope: string,
  ) => Promise<void>;
}

/**
 * Owns the installed-skills list data and its mutations. `openSkill` is invoked after a successful
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
    fetchSkills,
    createSkill,
    linkSkill,
  };
}
