import DashboardLayout from "@/components/layouts/ExampleLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import type { ReportsFile, Project } from "@/types/session";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  ImageIcon,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

type ReportsItem = {
  project: Project;
  file: ReportsFile;
};

type ReportsPayload = {
  file: ReportsFile;
  content?: string;
  data_url?: string;
  error?: string;
};

const readJson = async (res: Response) => {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  return res.json();
};

const projectName = (path: string) => path.split("/").pop() || path;

const itemKey = (item: ReportsItem) => `${item.project.path}:${item.file.path}`;

const formatBytes = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const Reports = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ReportsItem[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [payloads, setPayloads] = useState<Record<string, ReportsPayload>>({});
  const [loading, setLoading] = useState(true);
  const [fileLoadingKey, setFileLoadingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const expandedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    expandedKeyRef.current = expandedKey;
  }, [expandedKey]);

  const loadFile = useCallback(async (item: ReportsItem) => {
    const key = itemKey(item);
    setExpandedKey(key);
    if (payloads[key]) return;

    setFileLoadingKey(key);
    const params = new URLSearchParams({
      path: item.project.path,
      file: item.file.path,
    });
    const res = await apiFetch(`/api/projects/reports/file/?${params}`);
    setFileLoadingKey(null);
    const data = await readJson(res);
    setPayloads((current) => ({
      ...current,
      [key]:
        res.ok && data
          ? data
          : {
              file: item.file,
              error: data?.error || "Unable to load this file.",
            },
    }));
  }, [payloads]);

  const toggleItem = (item: ReportsItem) => {
    const key = itemKey(item);
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    loadFile(item);
  };

  const deleteItem = useCallback(
    async (item: ReportsItem) => {
      const key = itemKey(item);
      setDeletingKey(key);
      const params = new URLSearchParams({
        path: item.project.path,
        file: item.file.path,
      });
      const res = await apiFetch(`/api/projects/reports/file/?${params}`, {
        method: "DELETE",
      });
      const data = await readJson(res);
      setDeletingKey(null);

      if (!res.ok) {
        toast.error(data?.error || "Failed to delete report");
        return;
      }

      setItems((current) =>
        current.filter((currentItem) => itemKey(currentItem) !== key),
      );
      setPayloads((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      if (expandedKeyRef.current === key) {
        setExpandedKey(null);
      }
      toast.success("Report deleted");
    },
    [],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const projectsRes = await apiFetch("/api/projects/recent/");
    const projectsData = await readJson(projectsRes);
    if (!projectsRes.ok || !projectsData) {
      setItems([]);
      setLoading(false);
      setError("Unable to load recent projects.");
      return;
    }

    const projects: Project[] = projectsData.projects ?? [];
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

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Reports
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {items.length} files across recent projects
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-[12px]"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>

        <Input
          placeholder="Search projects or files..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-7 max-w-[260px] text-[12.5px]"
        />

        {error ? (
          <div className="rounded border border-border bg-surface px-3 py-2 text-[12px] text-muted-foreground">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-[12px] text-muted-foreground">
            Loading reports...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded border border-dashed border-border bg-surface px-4 py-6 text-center text-[12px] text-muted-foreground">
            No reports files found across recent projects.
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded border border-dashed border-border bg-surface px-4 py-6 text-center text-[12px] text-muted-foreground">
            No files match.
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-border bg-surface">
            {filteredItems.map((item, index) => {
              const key = itemKey(item);
              const expanded = expandedKey === key;
              const payload = payloads[key];
              const Icon = item.file.kind === "image" ? ImageIcon : FileText;
              return (
                <div
                  key={key}
                  className={index > 0 ? "border-t border-border" : ""}
                >
                  <div className="flex items-center gap-1 px-3 py-2 transition-colors hover:bg-surface-muted">
                    <button
                      type="button"
                      onClick={() => toggleItem(item)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                          <span className="truncate text-[13px] font-medium text-foreground">
                            {item.file.name}
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            {projectName(item.project.path)}
                          </span>
                        </div>
                        <div className="truncate font-mono text-[10.5px] text-muted-foreground/75">
                          {formatDate(item.file.updated_at)} · {formatBytes(item.file.size)} ·{" "}
                          {item.file.path}
                        </div>
                      </div>
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          disabled={deletingKey === key}
                          aria-label={`Delete ${item.file.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete report?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will delete {item.file.name} from this project's reports folder.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction asChild>
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => {
                                void deleteItem(item);
                              }}
                            >
                              Delete report
                            </Button>
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {expanded ? (
                    <div className="border-t border-border bg-background px-4 py-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
                          {item.project.path}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 shrink-0 px-2.5 text-[12px]"
                          onClick={() =>
                            navigate(
                              `/dashboard/project?path=${encodeURIComponent(item.project.path)}`,
                            )
                          }
                        >
                          Open project
                        </Button>
                      </div>

                      {fileLoadingKey === key ? (
                        <div className="text-[12px] text-muted-foreground">
                          Loading file...
                        </div>
                      ) : payload?.error ? (
                        <div className="rounded border border-border bg-surface-muted px-3 py-2 text-[12px] text-muted-foreground">
                          {payload.error}
                        </div>
                      ) : payload?.file.kind === "image" && payload.data_url ? (
                        <img
                          src={payload.data_url}
                          alt={payload.file.name}
                          className="max-h-[70vh] max-w-full rounded border border-border object-contain"
                        />
                      ) : payload?.file.kind === "markdown" ? (
                        <article className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {payload.content ?? ""}
                          </ReactMarkdown>
                        </article>
                      ) : payload?.content ? (
                        <pre className="whitespace-pre-wrap rounded border border-border bg-surface-muted p-3 text-[12px] leading-relaxed text-foreground">
                          {payload.content}
                        </pre>
                      ) : (
                        <div className="text-[12px] text-muted-foreground">
                          Select a file to preview.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
