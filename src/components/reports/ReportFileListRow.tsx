import { TagPicker } from "@/components/tags/TagPicker";
import { OpenInNewTabMenu } from "@/components/workspace/OpenInNewTabMenu";
import { reportTabTarget } from "@/lib/workspace-tabs";
import { Button } from "@/components/ui/button";
import type { TagOption } from "@/lib/item-tags";
import { reportDisplayName } from "@/lib/reportTitle";
import { cn } from "@/lib/utils";
import type { ReportsFile } from "@/types/session";
import { Download, FileText, ImageIcon } from "lucide-react";
import { type ReactNode } from "react";

import { ReportDeleteButton } from "./ReportDeleteButton";
import type { ReportFilePayload } from "./reportFileTypes";

type ReportFileListRowProps = {
  projectPath: string;
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

export const ReportFileListRow = ({
  projectPath,
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
    <OpenInNewTabMenu
      target={reportTabTarget(projectPath, file.path, displayName)}
    >
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
          <ReportDeleteButton
            file={file}
            deleting={deleting}
            onDelete={onDelete}
          />
        </div>
      </div>
    </OpenInNewTabMenu>
  );
};
