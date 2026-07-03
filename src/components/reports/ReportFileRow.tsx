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
import { reportDetailKeyboardAction } from "@/lib/reportDetailKeyboard";
import { reportDisplayName } from "@/lib/reportTitle";
import { cn } from "@/lib/utils";
import type { ReportsFile } from "@/types/session";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ImageIcon,
  Play,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type ReportFilePayload = {
  file: ReportsFile;
  content?: string;
  data_url?: string;
  error?: string;
  provenance?: ReportProvenance;
};

export type ReportProvenance = {
  thread_id?: string;
  thread_name?: string;
  agent_name?: string;
  source?: string;
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
  onStartAction?: () => void;
  onOpenThread?: () => void;
  onSendFollowUp?: (message: string) => Promise<boolean> | boolean;
  onDownload: () => void;
  onDelete: () => void;
  onSaveContent?: (content: string) => Promise<ReportFilePayload | null> | ReportFilePayload | null;
  onTagsChange?: (tags: string[]) => Promise<void> | void;
  actioning?: boolean;
  downloading?: boolean;
  deleting?: boolean;
  saving?: boolean;
  followUpSending?: boolean;
  tagOptions?: TagOption[];
  tagsDisabled?: boolean;
};

type ReportFileListRowProps = {
  file: ReportsFile;
  active?: boolean;
  payload?: ReportFilePayload;
  metadata: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  rowClassName?: string;
  onOpen: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onTagsChange?: (tags: string[]) => Promise<void> | void;
  downloading?: boolean;
  deleting?: boolean;
  tagOptions?: TagOption[];
  tagsDisabled?: boolean;
};

type ReportFileDetailViewProps = {
  file: ReportsFile;
  loading: boolean;
  payload?: ReportFilePayload;
  title?: ReactNode;
  metadata: ReactNode;
  subtitle?: ReactNode;
  detailHeader?: ReactNode;
  loadingLabel?: string;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onStartAction?: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onSaveContent?: (content: string) => Promise<ReportFilePayload | null> | ReportFilePayload | null;
  onTagsChange?: (tags: string[]) => Promise<void> | void;
  actioning?: boolean;
  downloading?: boolean;
  deleting?: boolean;
  saving?: boolean;
  tagOptions?: TagOption[];
  tagsDisabled?: boolean;
  scrollTop?: number;
  onScrollTopChange?: (scrollTop: number) => void;
};

export const ReportFileListRow = ({
  file,
  active = false,
  payload,
  metadata,
  subtitle,
  className = "",
  rowClassName = "px-3",
  onOpen,
  onDownload,
  onDelete,
  onTagsChange,
  downloading = false,
  deleting = false,
  tagOptions = [],
  tagsDisabled = false,
}: ReportFileListRowProps) => {
  const Icon = file.kind === "image" ? ImageIcon : FileText;
  const displayName = reportDisplayName(file, payload);

  return (
    <div className={className}>
      <div
        className={cn(
          "flex items-center gap-1 py-2 transition-colors hover:bg-surface-muted",
          active ? "bg-surface-muted" : "",
          rowClassName,
        )}
      >
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
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
        <ReportDeleteButton file={file} deleting={deleting} onDelete={onDelete} />
      </div>
    </div>
  );
};

export const ReportFileDetailView = ({
  file,
  loading,
  payload,
  title,
  metadata,
  subtitle,
  detailHeader,
  loadingLabel = "Loading file...",
  onClose,
  onPrevious,
  onNext,
  hasPrevious = Boolean(onPrevious),
  hasNext = Boolean(onNext),
  onStartAction,
  onOpenThread,
  onSendFollowUp,
  onDownload,
  onDelete,
  onSaveContent,
  onTagsChange,
  actioning = false,
  downloading = false,
  deleting = false,
  saving = false,
  followUpSending = false,
  tagOptions = [],
  tagsDisabled = false,
  scrollTop = 0,
  onScrollTopChange,
}: ReportFileDetailViewProps) => {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [followUpDraft, setFollowUpDraft] = useState("");
  const displayName = title ?? reportDisplayName(file, payload);
  const provenance = payload?.provenance;
  const hasThreadProvenance = Boolean(provenance?.thread_id);
  const hasDisplayProvenance = Boolean(
    provenance?.thread_id || provenance?.thread_name || provenance?.agent_name,
  );
  const canFollowUp = Boolean(hasThreadProvenance && onSendFollowUp);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.scrollTop = scrollTop;
  }, [file.path, scrollTop]);

  useEffect(() => {
    detailRef.current?.focus();
  }, [file.path]);

  useEffect(() => {
    setDeleteConfirmOpen(false);
  }, [file.path]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = reportDetailKeyboardAction({
        key: event.key,
        hasPrevious,
        hasNext,
        editingTarget: isEditingTarget(event.target),
        blockedByDialog: deleteConfirmOpen || isInsideAlertDialog(event.target),
        defaultPrevented: event.defaultPrevented,
      });
      if (!action) return;

      if (action === "close") {
        event.preventDefault();
        onClose();
        return;
      }

      if (action === "previous" && onPrevious) {
        event.preventDefault();
        onPrevious();
        return;
      }

      if (action === "next" && onNext) {
        event.preventDefault();
        onNext();
        return;
      }

      if (action === "delete") {
        event.preventDefault();
        setDeleteConfirmOpen(true);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [deleteConfirmOpen, hasNext, hasPrevious, onClose, onNext, onPrevious]);

  const detail = (
    <div
      ref={detailRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Report detail: ${file.name}`}
      tabIndex={-1}
      className="fixed inset-0 z-40 flex h-[100dvh] w-screen max-w-none flex-col bg-background outline-none"
    >
      <div className="flex min-h-0 shrink-0 flex-col border-b border-border bg-surface">
        <div className="flex min-h-[52px] items-center gap-2 px-3 py-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            aria-label="Close report"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold text-foreground">
              {displayName}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
              {subtitle ? (
                <span className="truncate text-[11px] text-muted-foreground">
                  {subtitle}
                </span>
              ) : null}
              <span className="truncate font-mono text-[10.5px] text-muted-foreground/75">
                {metadata}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              disabled={!hasPrevious}
              aria-label="Previous report"
              onClick={onPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              disabled={!hasNext}
              aria-label="Next report"
              onClick={onNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
          <div className="min-w-0 flex-1">{detailHeader}</div>
          <div className="flex shrink-0 items-center gap-1.5">
            {onStartAction ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2 text-[12px]"
                disabled={actioning}
                onClick={onStartAction}
              >
                <Play className="h-3.5 w-3.5" />
                Implement
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2 text-[12px]"
              disabled={downloading}
              onClick={onDownload}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
            {onTagsChange ? (
              <TagPicker
                tags={file.tags ?? []}
                options={tagOptions}
                disabled={tagsDisabled}
                onChange={onTagsChange}
              />
            ) : null}
            <ReportDeleteButton
              file={file}
              deleting={deleting}
              open={deleteConfirmOpen}
              onOpenChange={setDeleteConfirmOpen}
              onDelete={onDelete}
            />
          </div>
        </div>
      </div>
      <div
        ref={bodyRef}
        className="min-h-0 flex-1 overflow-auto px-4 py-4"
        onScroll={(event) => onScrollTopChange?.(event.currentTarget.scrollTop)}
      >
        <div className="mx-auto max-w-5xl">
          <ReportFilePreview
            loading={loading}
            loadingLabel={loadingLabel}
            payload={payload}
            saving={saving}
            onSaveContent={onSaveContent}
          />
        </div>
      </div>
      <div className="shrink-0 border-t border-border bg-surface px-3 py-2">
        <div className="mx-auto grid max-w-5xl gap-2 md:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] md:items-end">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
              <span className="font-medium text-foreground">
                {hasThreadProvenance
                  ? "Generated by"
                  : hasDisplayProvenance
                    ? "Limited provenance"
                    : "Generating thread unavailable"}
              </span>
              {provenance?.agent_name ? (
                <span className="text-muted-foreground">{provenance.agent_name}</span>
              ) : null}
              {provenance?.thread_name ? (
                <span className="truncate text-muted-foreground">
                  {provenance.thread_name}
                </span>
              ) : null}
              {provenance?.thread_id ? (
                <span className="truncate font-mono text-[10.5px] text-muted-foreground/75">
                  {provenance.thread_id}
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {hasThreadProvenance
                ? "Send a follow-up to the originating Super Agent thread."
                : hasDisplayProvenance
                  ? "This report names an agent or thread, but lacks the required Super Agent thread ID for safe routing."
                  : "This report does not include explicit provenance metadata yet."}
            </div>
          </div>
          <div className="flex min-w-0 items-end gap-2">
            <Textarea
              value={followUpDraft}
              onChange={(event) => setFollowUpDraft(event.target.value)}
              placeholder={
                hasThreadProvenance
                  ? "Message the generating agent..."
                  : "Thread ID unavailable"
              }
              disabled={!canFollowUp || followUpSending}
              className="h-16 min-h-16 resize-none text-[12px]"
            />
            <div className="flex shrink-0 flex-col gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[12px]"
                disabled={!hasThreadProvenance}
                onClick={onOpenThread}
              >
                Open
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 px-2 text-[12px]"
                disabled={!canFollowUp || !followUpDraft.trim() || followUpSending}
                onClick={async () => {
                  const sent = await onSendFollowUp?.(followUpDraft.trim());
                  if (sent) {
                    setFollowUpDraft("");
                  }
                }}
              >
                {followUpSending ? "Sending" : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return detail;
  }

  return createPortal(detail, document.body);
};

const isEditingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const editable = target.closest(
    "input, textarea, select, [contenteditable='true'], [role='textbox']",
  );
  return editable instanceof HTMLElement;
};

const isInsideAlertDialog = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("[role='alertdialog']"));
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
  onStartAction,
  onDownload,
  onDelete,
  onSaveContent,
  onTagsChange,
  actioning = false,
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
        <ReportDeleteButton file={file} deleting={deleting} onDelete={onDelete} />
      </div>

      {expanded ? (
        <div className="border-t border-border bg-background px-4 py-4">
          {expandedHeader || onStartAction ? (
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">{expandedHeader}</div>
              {onStartAction ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 px-2 text-[12px]"
                  disabled={actioning}
                  onClick={onStartAction}
                >
                  <Play className="h-3 w-3" />
                  Implement
                </Button>
              ) : null}
            </div>
          ) : null}
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

const ReportDeleteButton = ({
  file,
  deleting,
  onDelete,
  open,
  onOpenChange,
}: {
  file: ReportsFile;
  deleting: boolean;
  onDelete: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const confirmDelete = () => {
    if (deleting) return;
    onOpenChange?.(false);
    onDelete();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
      <AlertDialogContent
        onKeyDownCapture={(event) => {
          if (event.key !== "Enter" || isEditingTarget(event.target)) return;
          event.preventDefault();
          event.stopPropagation();
          confirmDelete();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Delete report?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete {file.name} from this project's reports folder.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Delete report
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
