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
import { TagPicker } from "@/components/tags/TagPicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TagOption } from "@/lib/item-tags";
import { reportDisplayName } from "@/lib/reportTitle";
import type { ReportsFile } from "@/types/session";
import { ChevronDown, ChevronRight, Download, FileText, ImageIcon, Save, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type ReportFilePayload = {
  file: ReportsFile;
  content?: string;
  data_url?: string;
  error?: string;
};

type ReportFileRowProps = {
  file: ReportsFile;
  expanded: boolean;
  loading: boolean;
  payload?: ReportFilePayload;
  metadata: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  rowClassName?: string;
  expandedHeader?: ReactNode;
  loadingLabel?: string;
  onToggle: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onSaveContent?: (content: string) => Promise<ReportFilePayload | null> | ReportFilePayload | null;
  onTagsChange?: (tags: string[]) => Promise<void> | void;
  downloading?: boolean;
  deleting?: boolean;
  saving?: boolean;
  tagOptions?: TagOption[];
  tagsDisabled?: boolean;
};

export const ReportFileRow = ({
  file,
  expanded,
  loading,
  payload,
  metadata,
  subtitle,
  className = "",
  rowClassName = "px-3",
  expandedHeader,
  loadingLabel = "Loading file...",
  onToggle,
  onDownload,
  onDelete,
  onSaveContent,
  onTagsChange,
  downloading = false,
  deleting = false,
  saving = false,
  tagOptions = [],
  tagsDisabled = false,
}: ReportFileRowProps) => {
  const Icon = file.kind === "image" ? ImageIcon : FileText;
  const displayName = reportDisplayName(file, payload);

  return (
    <div className={className}>
      <div
        className={`flex items-center gap-1 py-2 transition-colors hover:bg-surface-muted ${rowClassName}`}
      >
        <button
          type="button"
          onClick={onToggle}
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
                {displayName}
              </span>
              {subtitle ? (
                <span className="truncate text-[11px] text-muted-foreground">
                  {subtitle}
                </span>
              ) : null}
            </div>
            <div className="truncate font-mono text-[10.5px] text-muted-foreground/75">
              {metadata}
            </div>
          </div>
        </button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          disabled={downloading}
          aria-label={`Download ${file.name}`}
          onClick={onDownload}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        {onTagsChange ? (
          <TagPicker
            tags={file.tags ?? []}
            options={tagOptions}
            disabled={tagsDisabled}
            onChange={onTagsChange}
          />
        ) : null}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              disabled={deleting}
              aria-label={`Delete ${file.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete report?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete {file.name} from this project's reports folder.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button type="button" variant="destructive" onClick={onDelete}>
                  Delete report
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {expanded ? (
        <div className="border-t border-border bg-background px-4 py-4">
          {expandedHeader}
          <ReportFilePreview
            loading={loading}
            loadingLabel={loadingLabel}
            payload={payload}
            saving={saving}
            onSaveContent={onSaveContent}
          />
        </div>
      ) : null}
    </div>
  );
};

const ReportFilePreview = ({
  loading,
  loadingLabel,
  payload,
  saving,
  onSaveContent,
}: {
  loading: boolean;
  loadingLabel: string;
  payload?: ReportFilePayload;
  saving: boolean;
  onSaveContent?: (content: string) => Promise<ReportFilePayload | null> | ReportFilePayload | null;
}) => {
  const [mode, setMode] = useState<"write" | "preview">("preview");
  const [draft, setDraft] = useState("");
  const content = payload?.content ?? "";
  const canEdit = payload?.file.kind === "markdown" && Boolean(onSaveContent);
  const dirty = draft !== content;

  useEffect(() => {
    setDraft(content);
  }, [content, payload?.file.path]);

  if (loading) {
    return <div className="text-[12px] text-muted-foreground">{loadingLabel}</div>;
  }
  if (payload?.error) {
    return (
      <div className="rounded border border-border bg-surface-muted px-3 py-2 text-[12px] text-muted-foreground">
        {payload.error}
      </div>
    );
  }
  if (payload?.file.kind === "image" && payload.data_url) {
    return (
      <img
        src={payload.data_url}
        alt={payload.file.name}
        className="max-h-[70vh] max-w-full rounded border border-border object-contain"
      />
    );
  }
  if (payload?.file.kind === "markdown") {
    if (canEdit) {
      return (
        <div className="overflow-hidden rounded border border-border bg-background">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-muted px-2 py-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant={mode === "write" ? "secondary" : "ghost"}
                className="h-7 px-2 text-[12px]"
                onClick={() => setMode("write")}
              >
                Write
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "preview" ? "secondary" : "ghost"}
                className="h-7 px-2 text-[12px]"
                onClick={() => setMode("preview")}
              >
                Preview
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              {dirty ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[12px]"
                  disabled={saving}
                  onClick={() => setDraft(content)}
                >
                  Revert
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="h-7 px-2 text-[12px]"
                disabled={!dirty || saving}
                onClick={async () => {
                  const result = await onSaveContent?.(draft);
                  if (result) {
                    setMode("preview");
                  }
                }}
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving" : "Save"}
              </Button>
            </div>
          </div>
          {mode === "write" ? (
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-[420px] resize-y rounded-none border-0 font-mono text-[12px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
              spellCheck={false}
            />
          ) : (
            <article className="prose prose-sm max-w-none px-4 py-4 dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {draft}
              </ReactMarkdown>
            </article>
          )}
        </div>
      );
    }
    return (
      <article className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {payload.content ?? ""}
        </ReactMarkdown>
      </article>
    );
  }
  if (payload?.content) {
    return (
      <pre className="whitespace-pre-wrap rounded border border-border bg-surface-muted p-3 text-[12px] leading-relaxed text-foreground">
        {payload.content}
      </pre>
    );
  }
  return (
    <div className="text-[12px] text-muted-foreground">
      Select a file to preview.
    </div>
  );
};
