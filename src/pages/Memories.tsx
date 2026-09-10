import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { MemoriesList } from "./memories/MemoriesList";
import { MemoryDetail } from "./memories/MemoryDetail";
import { useMemories } from "./memories/useMemories";
import { useMemoryDetail } from "./memories/useMemoryDetail";

const Memories = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectPath = searchParams.get("path") || "";
  const editingMemory = searchParams.get("memory") || "";
  const editingScope = searchParams.get("scope") || "";
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
    else if (editingScope) params.set("scope", editingScope);
    const query = params.toString();
    return query ? `?${query}` : "";
  })();

  const openMemory = useCallback(
    (name: string, scope: string) => {
      const params = new URLSearchParams(searchParams);
      params.set("memory", name);
      if (!projectPath) params.set("scope", scope);
      else params.delete("scope");
      setSearchParams(params);
    },
    [searchParams, setSearchParams, projectPath],
  );

  const backToList = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("memory");
    params.delete("scope");
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const memoriesData = useMemories(listApiParams);
  const detail = useMemoryDetail({
    editingMemory,
    detailApiParams,
    onDeleted: backToList,
    refreshList: memoriesData.fetchMemories,
  });

  const scopeLabel = projectPath ? projectPath.split("/").pop() : "global";
  const editingSection = memoriesData.sections.find(
    (section) => section.key === editingScope,
  );

  if (editingMemory) {
    return (
      <DashboardLayout>
        <MemoryDetail
          editingMemory={editingMemory}
          scopeLabel={editingSection?.label ?? ""}
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
              Memories
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

        <MemoriesList
          openMemory={openMemory}
          sections={memoriesData.sections}
          loading={memoriesData.loading}
          setLoading={memoriesData.setLoading}
          listError={memoriesData.listError}
          fetchMemories={memoriesData.fetchMemories}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
        />
      </div>
    </DashboardLayout>
  );
};

export default Memories;
