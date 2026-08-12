import { apiFetch } from "@/lib/api";
import { reportAssetDownloadPath } from "@/lib/reportMarkdownAssets";
import { useEffect, useState, type ImgHTMLAttributes } from "react";

export type ReportMarkdownImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  node?: unknown;
  projectPath?: string;
  reportPath?: string;
};

export const ReportMarkdownImage = ({
  node: _node,
  src,
  alt,
  projectPath,
  reportPath,
  ...props
}: ReportMarkdownImageProps) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const source = typeof src === "string" ? src : undefined;
  const downloadPath = reportAssetDownloadPath(projectPath, reportPath, source);

  useEffect(() => {
    setObjectUrl(null);
    setFailed(false);
    if (!downloadPath) return;

    let cancelled = false;
    let nextObjectUrl: string | null = null;

    const loadImage = async () => {
      try {
        const res = await apiFetch(downloadPath);
        if (!res.ok) {
          throw new Error("Unable to load report image");
        }
        const blob = await res.blob();
        nextObjectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(nextObjectUrl);
          return;
        }
        setObjectUrl(nextObjectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    void loadImage();

    return () => {
      cancelled = true;
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
    };
  }, [downloadPath]);

  if (downloadPath && !objectUrl) {
    return (
      <span className="block rounded border border-border bg-surface-muted px-3 py-2 text-[12px] text-muted-foreground">
        {failed ? "Unable to load image." : "Loading image..."}
        {alt ? ` ${alt}` : ""}
      </span>
    );
  }

  return <img {...props} src={objectUrl ?? source} alt={alt ?? ""} />;
};
