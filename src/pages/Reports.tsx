import DashboardLayout from "@/components/layouts/ExampleLayout";
import {
  ResourceEmptyState,
  ResourceError,
  ResourceLoading,
  ResourcePageHeader,
} from "@/components/resource/ResourcePage";
import { ReportFileRow } from "@/components/reports/ReportFileRow";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { readJson } from "@/lib/api-errors";
import { setReportTags } from "@/lib/item-tags";
import { fetchAllProjectPages, projectName } from "@/lib/project-display";
import { groupReportItems } from "@/lib/reportGroups";
import { formatReportBytes, formatReportDate } from "@/lib/reportFormatting";
import { useReportFileActions } from "@/lib/useReportFileActions";
import { useTagOptions } from "@/lib/useTagOptions";
import type { ReportsFile, Project } from "@/types/session";
import {
  ChevronDown,
  ChevronRight,
  Folder,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type ReportsItem = {
  project: Project;
  file: ReportsFile;
};

const itemKey = (item: ReportsItem) => `${item.project.path}:${item.file.path}`;

const mergeProjects = (projects: Project[], globalProjects: Project[]) => {
  const byPath = new Map<string, Project>();
  [...projects, ...globalProjects].forEach((project) => {
    const existing = byPath.get(project.path);
    byPath.set(project.path, existing ? { ...project, ...existing } : project);
  });
  return Array.from(byPath.values());
};

const Reports = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ReportsItem[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const expandedKeyRef = useRef<string | null>(null);
  const { tagOptions, refreshTagOptions } = useTagOptions();
  const {
    payloads,
    fileLoadingKey,
    deletingKey,
    downloadingKey,
    savingKey,
    actioningKey,
    loadReportFile,
    deleteReport,
    downloadReport,
    saveReportFile,
    startReportAction,
    setPayloads,
  } = useReportFileActions({
    onDeleted: ({ key }) => {
      setItems((current) =>
        current.filter((currentItem) => itemKey(currentItem) !== key),
      );
      if (expandedKeyRef.current === key) {
        setExpandedKey(null);
      }
    },
  });

  useEffect(() => {
    expandedKeyRef.current = expandedKey;
  }, [expandedKey]);

  const loadFile = useCallback(async (item: ReportsItem) => {
    const key = itemKey(item);
    setExpandedKey(key);
    await loadReportFile({
      key,
      projectPath: item.project.path,
      file: item.file,
    });
  }, [loadReportFile]);

  const toggleItem = (item: ReportsItem) => {
    const key = itemKey(item);
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    loadFile(item);
  };

  const deleteItem = useCallback(
    (item: ReportsItem) =>
      deleteReport({
        key: itemKey(item),
        projectPath: item.project.path,
        file: item.file,
      }),
    [deleteReport],
  );

  const downloadItem = useCallback(
    (item: ReportsItem) =>
      downloadReport({
        key: itemKey(item),
        projectPath: item.project.path,
        file: item.file,
      }),
    [downloadReport],
  );

  const saveItemContent = useCallback(
    async (item: ReportsItem, content: string) => {
      const key = itemKey(item);
      const payload = await saveReportFile(
        {
          key,
          projectPath: item.project.path,
          file: item.file,
        },
        content,
      );
      if (payload?.file) {
        setItems((current) =>
          current.map((currentItem) =>
            itemKey(currentItem) === key
              ? { ...currentItem, file: payload.file }
              : currentItem,
          ),
        );
      }
      return payload;
    },
    [saveReportFile],
  );

  const startActionItem = useCallback(
    async (item: ReportsItem) => {
      const result = await startReportAction({
        key: itemKey(item),
        projectPath: item.project.path,
        file: item.file,
      });
      if (result?.thread_id) {
        navigate(`/dashboard/threads/${result.thread_id}`);
      }
    },
    [navigate, startReportAction],
  );

  const updateItemTags = useCallback(
    async (item: ReportsItem, tags: string[]) => {
      const key = itemKey(item);
      try {
        const payload = await setReportTags(
          item.project.path,
          item.file.path,
          tags,
        );
        setItems((current) =>
          current.map((currentItem) =>
            itemKey(currentItem) === key
              ? {
                  ...currentItem,
                  file: { ...currentItem.file, tags: payload.tags },
                }
              : currentItem,
          ),
        );
        setPayloads((current) => {
          const existing = current[key];
          if (!existing) return current;
          return {
            ...current,
            [key]: {
              ...existing,
              file: { ...existing.file, tags: payload.tags },
            },
          };
        });
        void refreshTagOptions();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update tags");
      }
    },
    [refreshTagOptions, setPayloads],
  );

  const toggleGroup = (key: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [recentProjects, globalProjectsRes] = await Promise.all([
      fetchAllProjectPages(apiFetch),
      apiFetch("/api/projects/reports/global/"),
    ]);
    const globalProjectsData = await readJson(globalProjectsRes);

    const projects = mergeProjects(
      recentProjects,
      globalProjectsRes.ok ? (globalProjectsData?.projects ?? []) : [],
    );
    const candidates = projects.filter(
      (project) =>
        typeof project.reports_count !== "number" ||
        project.reports_count > 0,
    );

    const loaded = await Promise.all(
      candidates.map(async (project) => {
        const params = new URLSearchParams({ path: project.path });
        const res = await apiFetch(`/api/projects/reports/?${params}`);
        const data = await readJson(res);
        if (!res.ok || !data) return [];
        const files: ReportsFile[] = data.files ?? [];
        return files.map((file) => ({ project, file }));
      }),
    );

    const nextItems = loaded
      .flat()
      .sort((a, b) => b.file.updated_at - a.file.updated_at);

    setItems(nextItems);
    setLoading(false);

    const currentExpandedKey = expandedKeyRef.current;
    if (
      currentExpandedKey &&
      !nextItems.some((item) => itemKey(item) === currentExpandedKey)
    ) {
      setExpandedKey(null);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredItems = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return items;
    return items.filter(
      (item) =>
        item.file.name.toLowerCase().includes(trimmed) ||
        item.file.path.toLowerCase().includes(trimmed) ||
        projectName(item.project.path).toLowerCase().includes(trimmed) ||
        item.project.path.toLowerCase().includes(trimmed),
    );
  }, [items, query]);

  const groupedItems = useMemo(
    () =>
      groupReportItems(
        filteredItems,
        (item) => item.file,
        (item) => item.project.path,
      ),
    [filteredItems],
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <ResourcePageHeader
          title="Reports"
          loading={loading}
          onRefresh={fetchData}
          subtitle={`${items.length} files across recent and global report sources`}
        />

        <Input
          placeholder="Search projects or files..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-7 max-w-[260px] text-[12.5px]"
        />

        <ResourceError message={error} />

        {loading ? (
          <ResourceLoading>Loading reports...</ResourceLoading>
        ) : items.length === 0 ? (
          <ResourceEmptyState>
            No reports files found across recent projects or global report sources.
          </ResourceEmptyState>
        ) : filteredItems.length === 0 ? (
          <ResourceEmptyState>No files match.</ResourceEmptyState>
        ) : (
          <div className="overflow-hidden rounded border border-border bg-surface">
            {groupedItems.map((node, index) => {
              if (node.type === "group") {
                const key = `group:${node.key}`;
                const expanded = expandedGroups.has(key);
                return (
                  <div
                    key={key}
                    className={index > 0 ? "border-t border-border" : ""}
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroup(key)}
                      className="flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-muted"
                    >
                      {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                          <span className="truncate text-[13px] font-medium text-foreground">
                            {node.name}
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            {projectName(node.items[0]?.project.path ?? "")} ·{" "}
                            {node.items.length} files
                          </span>
                        </div>
                        <div className="truncate font-mono text-[10.5px] text-muted-foreground/75">
                          {formatReportDate(node.updated_at)} · {formatReportBytes(node.size)} ·{" "}
                          {node.path}/
                        </div>
                      </div>
                    </button>

                    {expanded ? (
                      <div className="border-t border-border bg-background/70">
                        {node.items.map((item) => {
                          const childKey = itemKey(item);
                          const childExpanded = expandedKey === childKey;
                          const childPayload = payloads[childKey];
                          return (
                            <ReportFileRow
                              key={childKey}
                              file={item.file}
                              expanded={childExpanded}
                              loading={fileLoadingKey === childKey}
                              payload={childPayload}
                              className="border-t border-border first:border-t-0"
                              rowClassName="pl-8 pr-3"
                              subtitle={projectName(item.project.path)}
                              metadata={
                                <>
                                  {formatReportDate(item.file.updated_at)} ·{" "}
                                  {formatReportBytes(item.file.size)} · {item.file.path}
                                </>
                              }
                              expandedHeader={
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <div className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
                                    {item.project.path}
                                  </div>
                                  <button
                                    type="button"
                                    className="h-7 shrink-0 rounded border border-border px-2.5 text-[12px] text-foreground hover:bg-surface-muted"
                                    onClick={() =>
                                      navigate(
                                        `/dashboard/project?path=${encodeURIComponent(item.project.path)}`,
                                      )
                                    }
                                  >
                                    Open project
                                  </button>
                                </div>
                              }
                              onToggle={() => toggleItem(item)}
                              onStartAction={() => void startActionItem(item)}
                              onDownload={() => void downloadItem(item)}
                              onDelete={() => void deleteItem(item)}
                              onSaveContent={(content) =>
                                saveItemContent(item, content)
                              }
                              onTagsChange={(tags) => updateItemTags(item, tags)}
                              tagOptions={tagOptions}
                              actioning={actioningKey === childKey}
                              downloading={downloadingKey === childKey}
                              deleting={deletingKey === childKey}
                              saving={savingKey === childKey}
                            />
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              }

              const item = node.item;
              const key = itemKey(item);
              const expanded = expandedKey === key;
              const payload = payloads[key];
              return (
                <ReportFileRow
                  key={key}
                  file={item.file}
                  expanded={expanded}
                  loading={fileLoadingKey === key}
                  payload={payload}
                  className={index > 0 ? "border-t border-border" : ""}
                  subtitle={projectName(item.project.path)}
                  metadata={
                    <>
                      {formatReportDate(item.file.updated_at)} ·{" "}
                      {formatReportBytes(item.file.size)} · {item.file.path}
                    </>
                  }
                  expandedHeader={
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
                        {item.project.path}
                      </div>
                      <button
                        type="button"
                        className="h-7 shrink-0 rounded border border-border px-2.5 text-[12px] text-foreground hover:bg-surface-muted"
                        onClick={() =>
                          navigate(
                            `/dashboard/project?path=${encodeURIComponent(item.project.path)}`,
                          )
                        }
                      >
                        Open project
                      </button>
                    </div>
                  }
                  onToggle={() => toggleItem(item)}
                  onStartAction={() => void startActionItem(item)}
                  onDownload={() => void downloadItem(item)}
                  onDelete={() => void deleteItem(item)}
                  onSaveContent={(content) => saveItemContent(item, content)}
                  onTagsChange={(tags) => updateItemTags(item, tags)}
                  tagOptions={tagOptions}
                  actioning={actioningKey === key}
                  downloading={downloadingKey === key}
                  deleting={deletingKey === key}
                  saving={savingKey === key}
                />
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
