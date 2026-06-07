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
import type { TagOption } from "@/lib/item-tags";
import type { ReportsFile } from "@/types/session";
import { ChevronDown, ChevronRight, Download, FileText, ImageIcon, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
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
  onTagsChange?: (tags: string[]) => Promise<void> | void;
  downloading?: boolean;
  deleting?: boolean;
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
  onTagsChange,
  downloading = false,
  deleting = false,
  tagOptions = [],
  tagsDisabled = false,
}: ReportFileRowProps) => {
  const Icon = file.kind === "image" ? ImageIcon : FileText;

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
                {file.name}
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
}: {
  loading: boolean;
  loadingLabel: string;
  payload?: ReportFilePayload;
}) => {
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
