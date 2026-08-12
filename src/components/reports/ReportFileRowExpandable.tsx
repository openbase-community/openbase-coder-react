import { TagPicker } from "@/components/tags/TagPicker";
import { Button } from "@/components/ui/button";
import type { TagOption } from "@/lib/item-tags";
import { reportDisplayName } from "@/lib/reportTitle";
import type { ReportsFile } from "@/types/session";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  ImageIcon,
  Play,
} from "lucide-react";
import { type ReactNode } from "react";

import { ReportDeleteButton } from "./ReportDeleteButton";
import { ReportFilePreview } from "./ReportFilePreview";
import type { ReportFilePayload } from "./reportFileTypes";

type ReportFileRowProps = {
  projectPath?: string;
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

export const ReportFileRow = ({
  projectPath,
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
            projectPath={projectPath}
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
