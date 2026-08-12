import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { PrintingPress } from "./skills/PrintingPress";
import { SkillDetail } from "./skills/SkillDetail";
import { SkillsList } from "./skills/SkillsList";
import { computeVisibleSections, sectionsByKeyFrom } from "./skills/scopes";
import { usePrintingPress } from "./skills/usePrintingPress";
import { useSkillDetail } from "./skills/useSkillDetail";
import { useSkills } from "./skills/useSkills";

const Skills = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectPath = searchParams.get("path") || "";
  const editingSkill = searchParams.get("skill") || "";
  const editingScope = searchParams.get("scope") || "home";
  const [activeView, setActiveView] = useState<"installed" | "printing-press">(
    "installed",
  );
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

  const skillsData = useSkills(listApiParams, openSkill);
  const detail = useSkillDetail({
    editingSkill,
    detailApiParams,
    onDeleted: backToList,
    refreshList: skillsData.fetchSkills,
  });
  const printingPress = usePrintingPress(
    activeView === "printing-press" && !projectPath,
  );

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
              variant={activeView === "installed" ? "default" : "outline"}
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              onClick={() => setActiveView("installed")}
            >
              Installed
            </Button>
            {!projectPath ? (
              <Button
                variant={
                  activeView === "printing-press" ? "default" : "outline"
                }
                size="sm"
                className="h-7 px-2.5 text-[12px]"
                onClick={() => setActiveView("printing-press")}
              >
                Printing Press
              </Button>
            ) : null}
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

        {activeView === "printing-press" && !projectPath ? (
          <PrintingPress {...printingPress} />
        ) : (
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
        )}
      </div>
    </DashboardLayout>
  );
};

export default Skills;
