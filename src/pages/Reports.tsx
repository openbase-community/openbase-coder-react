import DashboardLayout from "@/components/layouts/ExampleLayout";
import {
  ResourceEmptyState,
  ResourceError,
  ResourceLoading,
  ResourcePageHeader,
} from "@/components/resource/ResourcePage";
import {
  ReportFileDetailView,
  ReportFileListRow,
} from "@/components/reports/ReportFileRow";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { readJson } from "@/lib/api-errors";
import { setReportTags } from "@/lib/item-tags";
import { fetchAllProjectPages, projectName } from "@/lib/project-display";
import { nextReportIndexAfterDelete } from "@/lib/reportDetailNavigation";
import { groupReportItemsByDay } from "@/lib/reportGroups";
import { formatReportBytes, formatReportDate } from "@/lib/reportFormatting";
import { useReportFileActions } from "@/lib/useReportFileActions";
import { useTagOptions } from "@/lib/useTagOptions";
import type { ReportsFile, Project } from "@/types/session";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Folder,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<ReportsItem[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [reportScrollTops, setReportScrollTops] = useState<Record<string, number>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const activeKeyRef = useRef<string | null>(null);
  const { tagOptions, refreshTagOptions } = useTagOptions();
  const {
    payloads,
    fileLoadingKey,
    deletingKey,
    downloadingKey,
    savingKey,
    actioningKey,
    followUpSendingKey,
    loadReportFile,
    deleteReport,
    downloadReport,
    saveReportFile,
    startReportAction,
    sendReportFollowUp,
    setPayloads,
  } = useReportFileActions({
    onDeleted: ({ key }) => {
      setItems((current) =>
        current.filter((currentItem) => itemKey(currentItem) !== key),
      );
      if (activeKeyRef.current === key) {
        setActiveKey(null);
      }
    },
  });

  useEffect(() => {
    activeKeyRef.current = activeKey;
  }, [activeKey]);

  const loadFile = useCallback(async (item: ReportsItem) => {
    const key = itemKey(item);
    setActiveKey(key);
    await loadReportFile({
      key,
      projectPath: item.project.path,
      file: item.file,
    });
  }, [loadReportFile]);

  const navigateToItem = useCallback(
    (item: ReportsItem, options: { replace?: boolean } = {}) => {
      const params = new URLSearchParams(searchParams);
      params.set("project", item.project.path);
      params.set("report", item.file.path);
      navigate(
        {
          pathname: location.pathname,
          search: params.toString(),
        },
        options,
      );
    },
    [location.pathname, navigate, searchParams],
  );

  const navigateToList = useCallback(
    (options: { replace?: boolean } = {}) => {
      const params = new URLSearchParams(searchParams);
      params.delete("project");
      params.delete("report");
      navigate(
        {
          pathname: location.pathname,
          search: params.toString(),
        },
        options,
      );
    },
    [location.pathname, navigate, searchParams],
  );

  const openItem = (item: ReportsItem) => {
    navigateToItem(item);
    loadFile(item);
  };

  const closeActiveItem = () => navigateToList({ replace: true });

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
        setActiveKey(null);
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

    const currentExpandedKey = activeKeyRef.current;
    if (
      currentExpandedKey &&
      !nextItems.some((item) => itemKey(item) === currentExpandedKey)
    ) {
      setActiveKey(null);
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

  const deleteActiveItem = useCallback(
    async (item: ReportsItem) => {
      const index = filteredItems.findIndex(
        (currentItem) => itemKey(currentItem) === itemKey(item),
      );
      const nextIndex = nextReportIndexAfterDelete(index, filteredItems.length);
      const nextItem = nextIndex >= 0 ? filteredItems[nextIndex] : null;
      const deleted = await deleteItem(item);
      if (!deleted) return;

      if (nextItem) {
        navigateToItem(nextItem, { replace: true });
        await loadFile(nextItem);
      } else {
        navigateToList({ replace: true });
      }
    },
    [deleteItem, filteredItems, loadFile, navigateToItem, navigateToList],
  );

  const dateSections = useMemo(
    () =>
      groupReportItemsByDay(
        filteredItems,
        (item) => item.file,
        (item) => item.project.path,
      ),
    [filteredItems],
  );

  const activeIndex = useMemo(
    () => filteredItems.findIndex((item) => itemKey(item) === activeKey),
    [activeKey, filteredItems],
  );
  const activeItem = activeIndex >= 0 ? filteredItems[activeIndex] : null;
  const activePayload = activeItem ? payloads[itemKey(activeItem)] : undefined;
  const openAdjacentItem = (direction: number) => {
    if (activeIndex < 0) return;
    const nextItem = filteredItems[activeIndex + direction];
    if (nextItem) {
      navigateToItem(nextItem);
      loadFile(nextItem);
    }
  };
  const openProject = (projectPath: string) => {
    setActiveKey(null);
    navigate(`/dashboard/project?path=${encodeURIComponent(projectPath)}`);
  };

  useEffect(() => {
    const projectPath = searchParams.get("project");
    const reportPath = searchParams.get("report");
    if (!projectPath || !reportPath) {
      setActiveKey(null);
      return;
    }

    const item = items.find(
      (candidate) =>
        candidate.project.path === projectPath &&
        candidate.file.path === reportPath,
    );
    if (item) {
      loadFile(item);
    }
  }, [items, loadFile, searchParams]);

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
            {dateSections.map((section, sectionIndex) => (
              <section
                key={section.key}
                className={sectionIndex > 0 ? "border-t border-border" : ""}
              >
                <div className="bg-surface-muted px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.label}
                </div>
                {section.nodes.map((node, index) => {
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
                          const childExpanded = activeKey === childKey;
                          const childPayload = payloads[childKey];
                          return (
                            <ReportFileListRow
                              key={childKey}
                              file={item.file}
                              active={childExpanded}
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
                              onOpen={() => openItem(item)}
                              onDownload={() => void downloadItem(item)}
                              onDelete={() => void deleteItem(item)}
                              onTagsChange={(tags) => updateItemTags(item, tags)}
                              tagOptions={tagOptions}
                              downloading={downloadingKey === childKey}
                              deleting={deletingKey === childKey}
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
              const expanded = activeKey === key;
              const payload = payloads[key];
              return (
                <ReportFileListRow
                  key={key}
                  file={item.file}
                  active={expanded}
                  payload={payload}
                  className={index > 0 ? "border-t border-border" : ""}
                  subtitle={projectName(item.project.path)}
                  metadata={
                    <>
                      {formatReportDate(item.file.updated_at)} ·{" "}
                      {formatReportBytes(item.file.size)} · {item.file.path}
                    </>
                  }
                  onOpen={() => openItem(item)}
                  onDownload={() => void downloadItem(item)}
                  onDelete={() => void deleteItem(item)}
                  onTagsChange={(tags) => updateItemTags(item, tags)}
                  tagOptions={tagOptions}
                  downloading={downloadingKey === key}
                  deleting={deletingKey === key}
                />
              );
            })}
              </section>
            ))}
          </div>
        )}
        {activeItem ? (
          <ReportFileDetailView
            file={activeItem.file}
            loading={fileLoadingKey === itemKey(activeItem)}
            payload={activePayload}
            subtitle={projectName(activeItem.project.path)}
            metadata={
              <>
                {formatReportDate(activeItem.file.updated_at)} ·{" "}
                {formatReportBytes(activeItem.file.size)} · {activeItem.file.path}
              </>
            }
            detailHeader={
              <button
                type="button"
                className="inline-flex max-w-full items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-[12px] text-foreground hover:bg-surface-muted"
                onClick={() => openProject(activeItem.project.path)}
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate font-mono">
                  {activeItem.project.path}
                </span>
              </button>
            }
            onClose={closeActiveItem}
            onPrevious={() => openAdjacentItem(-1)}
            onNext={() => openAdjacentItem(1)}
            hasPrevious={activeIndex > 0}
            hasNext={activeIndex >= 0 && activeIndex < filteredItems.length - 1}
            onStartAction={() => void startActionItem(activeItem)}
            onOpenThread={
              activePayload?.provenance?.thread_id
                ? () => {
                    setActiveKey(null);
                    navigate(
                      `/dashboard/threads/${encodeURIComponent(activePayload.provenance!.thread_id!)}`,
                    );
                  }
                : undefined
            }
            onSendFollowUp={
              activePayload?.provenance?.thread_id
                ? (message) =>
                    sendReportFollowUp(
                      {
                        key: itemKey(activeItem),
                        projectPath: activeItem.project.path,
                        file: activeItem.file,
                      },
                      activePayload.provenance!.thread_id!,
                      message,
                    )
                : undefined
            }
            onDownload={() => void downloadItem(activeItem)}
            onDelete={() => void deleteActiveItem(activeItem)}
            onSaveContent={(content) => saveItemContent(activeItem, content)}
            onTagsChange={(tags) => updateItemTags(activeItem, tags)}
            tagOptions={tagOptions}
            actioning={actioningKey === itemKey(activeItem)}
            followUpSending={followUpSendingKey === itemKey(activeItem)}
            downloading={downloadingKey === itemKey(activeItem)}
            deleting={deletingKey === itemKey(activeItem)}
            saving={savingKey === itemKey(activeItem)}
            scrollTop={reportScrollTops[itemKey(activeItem)] ?? 0}
            onScrollTopChange={(scrollTop) =>
              setReportScrollTops((current) => ({
                ...current,
                [itemKey(activeItem)]: scrollTop,
              }))
            }
          />
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
