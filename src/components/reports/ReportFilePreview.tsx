import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { useMemo } from "react";
import { useWorkspaceDraft } from "@/contexts/workspace-tabs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ReportMarkdownImage, type ReportMarkdownImageProps } from "./ReportMarkdownImage";
import type { ReportFilePayload } from "./reportFileTypes";

export const ReportFilePreview = ({
  projectPath,
  loading,
  loadingLabel,
  payload,
  saving,
  onSaveContent,
}: {
  projectPath?: string;
  loading: boolean;
  loadingLabel: string;
  payload?: ReportFilePayload;
  saving: boolean;
  onSaveContent?: (content: string) => Promise<ReportFilePayload | null> | ReportFilePayload | null;
}) => {
  const content = payload?.content ?? "";
  const draftKey = JSON.stringify([projectPath, payload?.file.path]);
  const [mode, setMode] = useWorkspaceDraft(`report-mode:${draftKey}`, "preview");
  const [draft, setDraft] = useWorkspaceDraft(`report-edit:${draftKey}`, content);
  const canEdit = payload?.file.kind === "markdown" && Boolean(onSaveContent);
  const dirty = draft !== content;
  const reportPath = payload?.file.path;
  const markdownComponents = useMemo(
    () => ({
      img: (props: ReportMarkdownImageProps) => (
        <ReportMarkdownImage
          {...props}
          projectPath={projectPath}
          reportPath={reportPath}
        />
      ),
    }),
    [projectPath, reportPath],
  );

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
                  onClick={() => setDraft(undefined)}
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
                    setDraft(undefined);
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
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {draft}
              </ReactMarkdown>
            </article>
          )}
        </div>
      );
    }
    return (
      <article className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
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
