import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { cn } from "@/lib/utils";
import { Copy } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { kindInfo } from "./conflictGroups";
import { formatBytes, plural } from "./syncHealth";
import type {
  SyncBranchConflictDetail,
  SyncConflictDetailResponse,
  SyncDaemonConflict,
  SyncFileConflictDetail,
  SyncVersion,
} from "./syncTypes";

const short = (sha: string | null | undefined) => (sha ? sha.slice(0, 10) : "—");

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied.");
  } catch {
    toast.error("Could not copy to the clipboard.");
  }
};

const DiffBlock: React.FC<{ diff: string }> = ({ diff }) => (
  <pre
    className="max-h-96 overflow-auto rounded border bg-muted/30 p-2 font-mono text-[11px] leading-4"
    aria-label="Differences"
  >
    {diff.split("\n").map((line, index) => (
      <div
        key={index}
        className={cn(
          "whitespace-pre",
          line.startsWith("+++") || line.startsWith("---")
            ? "text-muted-foreground"
            : line.startsWith("+")
              ? "bg-success/10 text-success"
              : line.startsWith("-")
                ? "bg-destructive/10 text-destructive"
                : line.startsWith("@@")
                  ? "text-muted-foreground"
                  : "",
        )}
      >
        {line || " "}
      </div>
    ))}
  </pre>
);

const versionSummary = (version: SyncVersion) => {
  if (!version.hash) return "none (the file does not exist on this side)";
  if (!version.available) {
    return `${short(version.hash)} · not stored on this computer`;
  }
  const kind = version.binary
    ? " · binary"
    : version.truncated
      ? " · too large to show"
      : "";
  return `${short(version.hash)} · ${formatBytes(version.size)}${kind}`;
};

type Tab = "diff" | "a" | "b" | "ancestor";

const FileDetail: React.FC<{
  conflict: SyncDaemonConflict;
  detail: SyncFileConflictDetail;
  otherName: string;
}> = ({ conflict, detail, otherName }) => {
  const { a, b, ancestor } = detail.versions;
  const tabs: { id: Tab; label: string; version?: SyncVersion }[] = [
    ...(detail.diff != null ? [{ id: "diff" as Tab, label: "Differences" }] : []),
    { id: "a", label: "This computer", version: a },
    { id: "b", label: otherName, version: b },
    ...(ancestor.hash
      ? [{ id: "ancestor" as Tab, label: "Last agreed", version: ancestor }]
      : []),
  ];
  const [tab, setTab] = useState<Tab>(tabs[0].id);
  const active = tabs.find((entry) => entry.id === tab) ?? tabs[0];

  return (
    <div className="space-y-2">
      <dl className="grid gap-x-3 gap-y-0.5 text-[11px] sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">This computer</dt>
        <dd className="font-mono">{versionSummary(a)}</dd>
        <dt className="text-muted-foreground">{otherName}</dt>
        <dd className="font-mono">{versionSummary(b)}</dd>
        <dt className="text-muted-foreground">Last agreed</dt>
        <dd className="font-mono">
          {ancestor.hash ? versionSummary(ancestor) : "not recorded"}
        </dd>
        {detail.current ? (
          <>
            <dt className="text-muted-foreground">On disk now</dt>
            <dd className="font-mono">
              {detail.current.exists
                ? detail.current.is_dir
                  ? "a folder"
                  : formatBytes(detail.current.size)
                : "missing"}
            </dd>
          </>
        ) : null}
      </dl>
      <div className="flex flex-wrap gap-1" role="tablist">
        {tabs.map((entry) => (
          <Button
            key={entry.id}
            size="sm"
            variant={entry.id === active.id ? "secondary" : "ghost"}
            className="h-6 px-2 text-[11px]"
            role="tab"
            aria-selected={entry.id === active.id}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </Button>
        ))}
      </div>
      {active.id === "diff" && detail.diff != null ? (
        detail.diff ? (
          <>
            <p className="text-[11px] text-muted-foreground">
              Lines marked − are {otherName}'s, lines marked + are this
              computer's.
              {detail.diff_truncated ? " The diff is cut short." : ""}
            </p>
            <DiffBlock diff={detail.diff} />
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            The two versions have the same text (they differ only in
            metadata such as permissions).
          </p>
        )
      ) : active.version ? (
        active.version.text != null ? (
          <pre className="max-h-96 overflow-auto rounded border bg-muted/30 p-2 font-mono text-[11px] leading-4 whitespace-pre">
            {active.version.text}
          </pre>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {!active.version.hash
              ? "This side has no file."
              : !active.version.available
                ? "This version is not stored on this computer, so it cannot be shown here."
                : active.version.binary
                  ? "Binary content is not shown."
                  : `Too large to show (${formatBytes(active.version.size)}).`}
          </p>
        )
      ) : null}
      {conflict.kind === "content" && !ancestor.hash ? (
        <p className="text-[11px] text-muted-foreground">
          No common ancestor was recorded, so the two versions could not be
          merged automatically.
        </p>
      ) : null}
    </div>
  );
};

const CommitList: React.FC<{ title: string; commits: { sha: string; subject: string }[] }> = ({
  title,
  commits,
}) => (
  <div className="min-w-0">
    <div className="text-[11px] font-medium">{title}</div>
    {commits.length === 0 ? (
      <div className="text-[11px] text-muted-foreground">none</div>
    ) : (
      <ul className="space-y-0.5">
        {commits.map((commit) => (
          <li key={commit.sha} className="truncate text-[11px]">
            <span className="font-mono text-muted-foreground">
              {short(commit.sha)}
            </span>{" "}
            {commit.subject}
          </li>
        ))}
      </ul>
    )}
  </div>
);

const BranchDetail: React.FC<{
  detail: SyncBranchConflictDetail;
  otherName: string;
}> = ({ detail, otherName }) => {
  const name = detail.branch || detail.ref;
  const repo = detail.repo_path || detail.repo || ".";
  const deletedHere = !detail.this_sha;
  const deletedThere = !detail.other_sha;
  const cd = `cd ${JSON.stringify(repo)}`;
  const commands = deletedHere
    ? [
        cd,
        `# keep it: recreate it here once ${short(detail.other_sha)} is in this repository`,
        ...(detail.branch ? [`git branch ${detail.branch} ${short(detail.other_sha)}`] : []),
        `# or drop it: delete it on ${otherName} too`,
      ].join("\n")
    : deletedThere
      ? [
          cd,
          `# drop it everywhere: delete it here too`,
          ...(detail.branch ? [`git branch -D ${detail.branch}`] : []),
          `# or keep it: recreate it on ${otherName} at ${short(detail.this_sha)}`,
        ].join("\n")
      : [
          cd,
          `git log --oneline --graph ${short(detail.this_sha)} ${short(detail.other_sha)}`,
          ...(detail.branch
            ? [
                `git switch ${detail.branch}`,
                `git merge ${short(detail.other_sha)}   # or: git rebase ${short(detail.other_sha)}`,
              ]
            : []),
        ].join("\n");
  return (
    <div className="space-y-2 text-[11px]">
      {deletedHere ? (
        <p>
          This computer deleted <span className="font-mono">{name}</span>{" "}
          while {otherName} moved it to{" "}
          <span className="font-mono">{short(detail.other_sha)}</span>.
          Neither side was changed.
        </p>
      ) : deletedThere ? (
        <p>
          {otherName} deleted <span className="font-mono">{name}</span> while
          this computer moved it to{" "}
          <span className="font-mono">{short(detail.this_sha)}</span>. Neither
          side was changed.
        </p>
      ) : (
        <p>
          Neither computer's <span className="font-mono">{name}</span> was
          moved. This computer has it at{" "}
          <span className="font-mono">{short(detail.this_sha)}</span>,{" "}
          {otherName} at{" "}
          <span className="font-mono">{short(detail.other_sha)}</span>
          {detail.merge_base ? (
            <>
              ; they split at{" "}
              <span className="font-mono">{short(detail.merge_base)}</span>
            </>
          ) : null}
          .
          {detail.this_ahead != null && detail.other_ahead != null
            ? ` This computer has ${plural(detail.this_ahead, "commit")} the other lacks; ${otherName} has ${plural(detail.other_ahead, "commit")} this one lacks.`
            : ""}
        </p>
      )}
      {detail.moved_since && detail.current_sha ? (
        <p className="text-warning">
          This computer's branch has moved since (now at{" "}
          <span className="font-mono">{short(detail.current_sha)}</span>). The
          conflict stays open until both computers' branches point at the same
          commit.
        </p>
      ) : null}
      {!detail.current_sha && detail.repo_path && !deletedHere ? (
        <p className="text-muted-foreground">
          The branch no longer exists on this computer.
        </p>
      ) : null}
      {deletedHere || deletedThere ? null : detail.other_available ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <CommitList title="Only on this computer" commits={detail.this_only} />
          <CommitList title={`Only on ${otherName}`} commits={detail.other_only} />
        </div>
      ) : (
        <p className="text-muted-foreground">
          {otherName}'s commit is not in this computer's repository yet, so the
          commits cannot be compared here.
        </p>
      )}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">To reconcile on this computer</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            onClick={() => void copy(commands)}
          >
            <Copy className="mr-1 h-3 w-3" /> Copy
          </Button>
        </div>
        <pre className="overflow-auto rounded border bg-muted/30 p-2 font-mono leading-4 whitespace-pre">
          {commands}
        </pre>
        <p className="text-muted-foreground">
          When both computers point at the same commit, the conflict closes
          by itself.
        </p>
      </div>
    </div>
  );
};

/** Both sides of a conflict, loaded when the row is opened. */
export const ConflictDetail: React.FC<{
  conflict: SyncDaemonConflict;
  otherName: string;
}> = ({ conflict, otherName }) => {
  const [data, setData] = useState<SyncConflictDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(null);
    (async () => {
      try {
        const res = await apiFetch(`/api/sync/daemon/conflicts/${conflict.id}/`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(
            await extractErrorMessage(res, "Unable to load this conflict."),
          );
        }
        setData((await res.json()) as SyncConflictDetailResponse);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : "Unable to load this conflict.",
        );
      }
    })();
    return () => controller.abort();
  }, [conflict.id]);

  const explain = kindInfo(conflict.kind).explain;
  return (
    <div className="space-y-2 border-t bg-muted/10 p-2">
      {explain ? (
        <p className="text-[11px] text-muted-foreground">{explain}</p>
      ) : null}
      {error ? (
        <p className="text-[11px] text-destructive">{error}</p>
      ) : !data ? (
        <p className="text-[11px] text-muted-foreground">Loading…</p>
      ) : data.detail.kind === "git-branch" ? (
        <BranchDetail
          detail={data.detail as SyncBranchConflictDetail}
          otherName={otherName}
        />
      ) : (
        <FileDetail
          conflict={conflict}
          detail={data.detail as SyncFileConflictDetail}
          otherName={otherName}
        />
      )}
    </div>
  );
};
