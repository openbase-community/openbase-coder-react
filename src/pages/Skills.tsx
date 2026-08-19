import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { SkillDetail } from "./skills/SkillDetail";
import { MarketplaceCatalog } from "./skills/MarketplaceCatalog";
import { SkillsList } from "./skills/SkillsList";
import { computeVisibleSections, sectionsByKeyFrom } from "./skills/scopes";
import { useSkillDetail } from "./skills/useSkillDetail";
import { useSkills } from "./skills/useSkills";

const Skills = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectPath = searchParams.get("path") || "";
  const editingSkill = searchParams.get("skill") || "";
  const editingScope = searchParams.get("scope") || "home";
  const requestedView = searchParams.get("view");
  const view =
    !projectPath && (requestedView === "catalog" || requestedView === "routines")
      ? requestedView
      : "installed";
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const toggleSection = useCallback((sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }, []);

  const listApiParams = projectPath
    ? `?path=${encodeURIComponent(projectPath)}`
    : "";

  const detailApiParams = (() => {
    const params = new URLSearchParams();
    if (projectPath) params.set("path", projectPath);
    else if (editingScope !== "home") params.set("scope", editingScope);
    const query = params.toString();
    return query ? `?${query}` : "";
  })();

  const openSkill = useCallback(
    (name: string, scope = "home") => {
      const params = new URLSearchParams(searchParams);
      params.set("skill", name);
      if (!projectPath && scope !== "home") params.set("scope", scope);
      else params.delete("scope");
      setSearchParams(params);
    },
    [searchParams, setSearchParams, projectPath],
  );

  const backToList = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("skill");
    params.delete("scope");
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const setView = useCallback(
    (nextView: "installed" | "catalog" | "routines") => {
      const params = new URLSearchParams(searchParams);
      params.delete("skill");
      params.delete("scope");
      if (nextView === "installed") params.delete("view");
      else params.set("view", nextView);
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  const skillsData = useSkills(listApiParams, openSkill);
  const detail = useSkillDetail({
    editingSkill,
    detailApiParams,
    onDeleted: backToList,
    refreshList: skillsData.fetchSkills,
  });

  const visibleSections = computeVisibleSections(
    projectPath,
    skillsData.sections,
    skillsData.skills,
    skillsData.skillsDir,
  );
  const sectionsByKey = sectionsByKeyFrom(visibleSections);

  const scopeLabel = projectPath ? projectPath.split("/").pop() : "global";

  if (editingSkill) {
    return (
      <DashboardLayout>
        <SkillDetail
          editingSkill={editingSkill}
          editingScope={editingScope}
          projectPath={projectPath}
          sectionsByKey={sectionsByKey}
          onBack={backToList}
          {...detail}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Skills
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {scopeLabel}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant={projectPath ? "outline" : "default"}
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              onClick={() => setSearchParams(new URLSearchParams())}
            >
              global
            </Button>
            {projectPath ? (
              <Button size="sm" className="h-7 px-2.5 text-[12px]">
                {projectPath.split("/").pop()}
              </Button>
            ) : null}
          </div>
        </div>

        {!projectPath ? (
          <div className="flex gap-1 border-b border-border">
            {(
              [
                ["installed", "Installed"],
                ["catalog", "Catalog"],
                ["routines", "Routine templates"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                aria-current={view === key ? "page" : undefined}
                className={`border-b-2 px-2.5 py-1.5 text-[12px] transition-colors ${
                  view === key
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {view === "installed" ? (
          <SkillsList
            projectPath={projectPath}
            openSkill={openSkill}
            visibleSections={visibleSections}
            sectionsByKey={sectionsByKey}
            loading={skillsData.loading}
            setLoading={skillsData.setLoading}
            listError={skillsData.listError}
            fetchSkills={skillsData.fetchSkills}
            newName={skillsData.newName}
            setNewName={skillsData.setNewName}
            createSkill={skillsData.createSkill}
            syncingSkill={skillsData.syncingSkill}
            linkSkill={skillsData.linkSkill}
            autoLinkSettings={skillsData.autoLinkSettings}
            autoLinkSync={skillsData.autoLinkSync}
            savingAutoLink={skillsData.savingAutoLink}
            updateAutoLinkSetting={skillsData.updateAutoLinkSetting}
            runAutoLinkSync={skillsData.runAutoLinkSync}
            collapsedSections={collapsedSections}
            toggleSection={toggleSection}
          />
        ) : (
          <MarketplaceCatalog
            kind={view === "catalog" ? "skills" : "routines"}
            onInstalled={skillsData.fetchSkills}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Skills;
