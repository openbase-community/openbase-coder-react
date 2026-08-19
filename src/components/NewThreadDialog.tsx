import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { fetchAllProjectPages, projectName } from "@/lib/project-display";
import type { Project } from "@/types/session";
import { ArrowRight, Folder, LoaderCircle, Search } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Shared "start a new thread" project picker used by the dashboard and the
 * threads list on both the browser console and the Electron host, so there is
 * one create-thread experience rather than a per-surface dialog.
 */
export function NewThreadDialog({
  open,
  onOpenChange,
  trigger,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
}) {
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingPath, setCreatingPath] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const controlled = typeof open === "boolean";
  const isOpen = controlled ? open : internalOpen;

  const setOpen = (next: boolean) => {
    if (!controlled) setInternalOpen(next);
    onOpenChange?.(next);
    if (!next) {
      setQuery("");
      setError(null);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchAllProjectPages(apiFetch)
      .then((items) => {
        if (!cancelled) setProjects(items);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load projects.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return projects;
    return projects.filter(
      (project) =>
        project.path.toLowerCase().includes(normalized) ||
        projectName(project.path).toLowerCase().includes(normalized),
    );
  }, [projects, query]);

  const createThread = async (directory: string) => {
    setCreatingPath(directory);
    try {
      const response = await apiFetch("/api/threads/", {
        method: "POST",
        body: JSON.stringify({ directory }),
      });
      if (!response.ok) {
        throw new Error(
          await extractErrorMessage(response, "Failed to create thread"),
        );
      }
      const data = await response.json();
      setOpen(false);
      navigate(`/dashboard/threads/${data.thread_id}`);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Failed to create thread",
      );
    } finally {
      setCreatingPath(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        <DialogHeader className="px-5 pb-3 pt-5">
          <DialogTitle className="text-sm font-semibold">
            Start a new thread
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Choose the project Openbase should work in.
          </DialogDescription>
        </DialogHeader>
        <div className="border-y border-border bg-surface-muted px-4 py-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              className="h-9 pl-8"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects"
              value={query}
            />
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-2">
          {loading ? (
            <div className="flex min-h-36 items-center justify-center gap-2 text-[12px] text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading projects
            </div>
          ) : error ? (
            <div className="m-2 rounded-md bg-destructive/10 px-3 py-2.5 text-[12px] text-destructive">
              {error}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex min-h-36 flex-col items-center justify-center px-6 text-center">
              <Folder className="h-6 w-6 text-muted-foreground/45" />
              <p className="mt-2.5 text-[13px] font-medium text-foreground">
                {projects.length === 0
                  ? "No projects yet"
                  : "No matching projects"}
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {projects.length === 0
                  ? "Add a project first, then return here to start work."
                  : "Try a project name or part of its path."}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredProjects.map((project) => (
                <button
                  className="group flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  disabled={Boolean(creatingPath)}
                  key={project.path}
                  onClick={() => void createThread(project.path)}
                  type="button"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {creatingPath === project.path ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Folder className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-foreground">
                      {projectName(project.path)}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                      {project.path}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end border-t border-border bg-surface-muted px-4 py-2.5">
          <Button onClick={() => setOpen(false)} size="sm" variant="ghost">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NewThreadDialog;
