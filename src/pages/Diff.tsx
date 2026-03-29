import DashboardLayout from "@/components/layouts/ExampleLayout";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/auth";
import { ArrowLeft, ChevronDown, ChevronRight, List, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { parse, html as diff2html } from "diff2html";
import type { DiffFile } from "diff2html/lib/types";
import "diff2html/bundles/css/diff2html.min.css";

interface Repository {
  path: string;
  name: string;
  diff: string;
}

interface FileEntry {
  repoName: string;
  repoPath: string;
  file: DiffFile;
  /** Display name: shortest unique path segment */
  displayPath: string;
  status: "added" | "deleted" | "modified" | "renamed";
  key: string;
}

function fileStatus(f: DiffFile): FileEntry["status"] {
  if (f.isNew) return "added";
  if (f.isDeleted) return "deleted";
  if (f.isRename || f.isCopy) return "renamed";
  return "modified";
}

function statusLabel(s: FileEntry["status"]): string {
  switch (s) {
    case "added":
      return "A";
    case "deleted":
      return "D";
    case "renamed":
      return "R";
    case "modified":
      return "M";
  }
}

function statusColor(s: FileEntry["status"]): string {
  switch (s) {
    case "added":
      return "text-green-500";
    case "deleted":
      return "text-red-500";
    case "renamed":
      return "text-blue-500";
    case "modified":
      return "text-yellow-500";
  }
}

const DiffContent = ({ mobile }: { mobile?: boolean }) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [collapsedRepos, setCollapsedRepos] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(!mobile);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const projectPath = searchParams.get("path");

  const fetchDiff = useCallback(async () => {
    setLoading(true);
    const url = projectPath
      ? `/api/git/diff/?path=${encodeURIComponent(projectPath)}`
      : "/api/git/diff/";
    const res = await apiFetch(url);
    if (res.ok) {
      const data = await res.json();
      setRepositories(data.repositories);
    }
    setLoading(false);
  }, [projectPath]);

  useEffect(() => {
    fetchDiff();
    const interval = setInterval(fetchDiff, 30000);
    return () => clearInterval(interval);
  }, [fetchDiff]);

  /** Parse all repos into a flat list of file entries, grouped by repo */
  const { entries, byRepo } = useMemo(() => {
    const entries: FileEntry[] = [];
    const byRepo: Record<string, FileEntry[]> = {};

    for (const repo of repositories) {
      if (!repo.diff.trim()) continue;
      const files = parse(repo.diff);
      const repoEntries: FileEntry[] = [];
      for (const f of files) {
        const displayPath =
          f.isDeleted ? f.oldName.replace(/^[ab]\//, "") : f.newName.replace(/^[ab]\//, "");
        const key = `${repo.name}::${displayPath}`;
        const entry: FileEntry = {
          repoName: repo.name,
          repoPath: repo.path,
          file: f,
          displayPath,
          status: fileStatus(f),
          key,
        };
        entries.push(entry);
        repoEntries.push(entry);
      }
      if (repoEntries.length > 0) {
        byRepo[repo.name] = repoEntries;
      }
    }
    return { entries, byRepo };
  }, [repositories]);

  // Auto-select first file if nothing selected or selection no longer exists
  useEffect(() => {
    if (entries.length > 0 && (!selectedKey || !entries.find((e) => e.key === selectedKey))) {
      setSelectedKey(entries[0].key);
    }
  }, [entries, selectedKey]);

  const selectedEntry = useMemo(
    () => entries.find((e) => e.key === selectedKey) ?? null,
    [entries, selectedKey],
  );

  const selectedDiffHtml = useMemo(() => {
    if (!selectedEntry) return "";
    return diff2html([selectedEntry.file], {
      outputFormat: "line-by-line",
      drawFileList: false,
    });
  }, [selectedEntry]);

  const projectName = projectPath?.split("/").pop() || "";
  const repoNames = Object.keys(byRepo);
  const totalFiles = entries.length;

  const mobilePicker = mobile ? (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3">
        <button
          onClick={fetchDiff}
          className="pointer-events-auto rounded-full border border-border/70 bg-background/90 p-2 shadow-sm backdrop-blur transition-colors hover:bg-accent"
          aria-label="Refresh diff"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
        {totalFiles > 1 ? (
          <button
            onClick={() => setFilePickerOpen(true)}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur transition-colors hover:bg-accent"
          >
            <List className="h-4 w-4" />
            <span className="max-w-36 truncate">
              {selectedEntry?.displayPath ?? "Files"}
            </span>
          </button>
        ) : null}
      </div>
      {filePickerOpen ? (
        <div className="absolute inset-0 z-20 bg-background/96 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="text-base font-semibold">Changed Files</h2>
              <p className="text-xs text-muted-foreground">
                {totalFiles} file{totalFiles !== 1 ? "s" : ""} changed
              </p>
            </div>
            <button
              onClick={() => setFilePickerOpen(false)}
              className="rounded-full p-2 transition-colors hover:bg-accent"
              aria-label="Close file list"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto pb-8">
            {repoNames.map((repoName) => (
              <div key={repoName}>
                {repoNames.length > 1 ? (
                  <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {repoName}
                  </div>
                ) : null}
                {byRepo[repoName].map((entry) => (
                  <button
                    key={entry.key}
                    onClick={() => {
                      setSelectedKey(entry.key);
                      setFilePickerOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors ${
                      selectedKey === entry.key ? "bg-accent" : "hover:bg-accent/60"
                    }`}
                  >
                    <span
                      className={`shrink-0 text-xs font-mono font-bold w-4 text-center ${statusColor(entry.status)}`}
                    >
                      {statusLabel(entry.status)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {entry.displayPath}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  ) : null;

  return (
    <div className={`flex h-full flex-col ${mobile ? "relative bg-background" : ""}`}>
      {/* Header */}
      {!mobile ? (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            {projectPath && (
              <button
                onClick={() => navigate("/dashboard/projects")}
                className="p-1.5 hover:bg-accent rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-semibold">
                {projectPath ? `${projectName}` : "Git Diff"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {totalFiles} file{totalFiles !== 1 ? "s" : ""} changed
                {repoNames.length > 1 ? ` across ${repoNames.length} repos` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={fetchDiff}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      ) : mobilePicker}

      {!loading && totalFiles === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          No changes
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* Left panel: file list */}
          <div className={`${mobile ? "hidden" : sidebarOpen ? "w-72" : "w-0 overflow-hidden"} shrink-0 border-r border-border overflow-y-auto bg-muted/30 transition-all duration-200`}>
            {repoNames.map((repoName) => {
              const isCollapsed = !!collapsedRepos[repoName];
              return (
                <div key={repoName}>
                  {/* Repo header - only show if multi-repo */}
                  {repoNames.length > 1 && (
                    <button
                      onClick={() =>
                        setCollapsedRepos((prev) => ({
                          ...prev,
                          [repoName]: !prev[repoName],
                        }))
                      }
                      className="w-full px-3 py-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border hover:bg-accent/50 transition-colors"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-3 w-3 shrink-0" />
                      ) : (
                        <ChevronDown className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">{repoName}</span>
                      <span className="ml-auto text-[10px] font-normal tabular-nums">
                        {byRepo[repoName].length}
                      </span>
                    </button>
                  )}
                  {!isCollapsed &&
                    byRepo[repoName].map((entry) => (
                      <button
                        key={entry.key}
                        onClick={() => {
                          setSelectedKey(entry.key);
                          if (mobile) setSidebarOpen(false);
                        }}
                        className={`w-full text-left pl-3 pr-3 py-1.5 flex items-center gap-2 text-sm transition-colors border-b border-border/50 ${
                          selectedKey === entry.key
                            ? "bg-primary/10 border-l-2 border-l-primary pl-[10px] font-medium"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <span
                          className={`shrink-0 text-xs font-mono font-bold w-4 text-center ${statusColor(entry.status)}`}
                        >
                          {statusLabel(entry.status)}
                        </span>
                        <span className="truncate text-xs" title={entry.displayPath}>
                          {entry.displayPath}
                        </span>
                      </button>
                    ))}
                </div>
              );
            })}
          </div>

          {/* Right panel: diff content */}
          <div className="flex-1 overflow-auto min-w-0">
            {selectedEntry ? (
              <div
                className={`diff-container ${mobile ? "pt-14" : ""}`}
                dangerouslySetInnerHTML={{ __html: selectedDiffHtml }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a file to view its diff
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Diff = () => {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const mobile = searchParams.get("mobile") === "true";

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (mobile) {
    return (
      <div className="h-screen flex flex-col">
        <DiffContent mobile />
      </div>
    );
  }

  return (
    <DashboardLayout noPadding>
      <DiffContent />
    </DashboardLayout>
  );
};

export default Diff;
