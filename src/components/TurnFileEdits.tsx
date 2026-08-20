import { FileDiff } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Split an absolute edited-file path into a repo/group label and a display
 * name, relative to the thread's workspace directory. In a multi workspace the
 * sub-repos are the top-level directories under the workspace root, so the
 * first path segment is the repo; a file directly in the root falls back to the
 * workspace basename.
 */
function repoAndName(
  path: string,
  directory?: string,
): { repo: string; name: string } {
  let rel = path;
  if (directory && path.startsWith(directory)) {
    rel = path.slice(directory.length);
  }
  const segments = rel.split("/").filter(Boolean);
  const name = segments[segments.length - 1] ?? rel;
  const workspace = (directory ?? "").split("/").filter(Boolean).pop() ?? "";
  const repo = segments.length > 1 ? segments[0] : workspace || "workspace";
  return { repo, name };
}

/**
 * Compact, per-turn summary of the files the agent edited, grouped by repo:
 * one chip per repo showing a preview filename and "and N others", each
 * linking to that project's git diff view.
 */
export function TurnFileEdits({
  paths,
  directory,
}: {
  paths: string[];
  directory?: string;
}) {
  const navigate = useNavigate();
  const groups = useMemo(() => {
    const byRepo = new Map<string, string[]>();
    for (const path of paths) {
      const { repo, name } = repoAndName(path, directory);
      const names = byRepo.get(repo) ?? [];
      names.push(name);
      byRepo.set(repo, names);
    }
    return [...byRepo.entries()];
  }, [paths, directory]);

  if (!paths.length) return null;

  const openDiff = () => {
    if (directory) {
      navigate(`/dashboard/diff?path=${encodeURIComponent(directory)}`);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {groups.map(([repo, names]) => {
        const others = names.length - 1;
        return (
          <button
            key={repo}
            type="button"
            onClick={openDiff}
            title={names.join("\n")}
            className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-surface-muted px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
          >
            <FileDiff className="h-3 w-3 shrink-0" />
            <span className="font-medium text-foreground">{repo}</span>
            <span className="truncate font-mono">
              {names[0]}
              {others > 0 ? ` and ${others} other${others > 1 ? "s" : ""}` : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
