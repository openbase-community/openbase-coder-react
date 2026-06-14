import { apiFetch } from "@/lib/api";
import { readJson } from "@/lib/api-errors";
import { downloadReportFile } from "@/lib/reportFiles";
import type { ReportFilePayload } from "@/components/reports/ReportFileRow";
import type { ReportsFile } from "@/types/session";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export type ReportFileTarget = {
  key: string;
  projectPath: string;
  file: ReportsFile;
};

type UseReportFileActionsOptions = {
  loadErrorMessage?: string;
  onDeleted?: (target: ReportFileTarget) => void;
};

export const useReportFileActions = ({
  loadErrorMessage = "Unable to load this file.",
  onDeleted,
}: UseReportFileActionsOptions = {}) => {
  const [payloads, setPayloads] = useState<Record<string, ReportFilePayload>>({});
  const [fileLoadingKey, setFileLoadingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadReportFile = useCallback(
    async (target: ReportFileTarget) => {
      if (payloads[target.key]) return;

      setFileLoadingKey(target.key);
      const params = new URLSearchParams({
        path: target.projectPath,
        file: target.file.path,
      });
      const res = await apiFetch(`/api/projects/reports/file/?${params}`);
      setFileLoadingKey(null);
      const data = await readJson(res);
      setPayloads((current) => ({
        ...current,
        [target.key]:
          res.ok && data
            ? data
            : {
                file: target.file,
                error: data?.error || loadErrorMessage,
              },
      }));
    },
    [loadErrorMessage, payloads],
  );

  const deleteReport = useCallback(
    async (target: ReportFileTarget) => {
      setDeletingKey(target.key);
      const params = new URLSearchParams({
        path: target.projectPath,
        file: target.file.path,
      });
      const res = await apiFetch(`/api/projects/reports/file/?${params}`, {
        method: "DELETE",
      });
      const data = await readJson(res);
      setDeletingKey(null);

      if (!res.ok) {
        toast.error(data?.error || "Failed to delete report");
        return;
      }

      setPayloads((current) => {
        const next = { ...current };
        delete next[target.key];
        return next;
      });
      onDeleted?.(target);
      toast.success("Report deleted");
    },
    [onDeleted],
  );

  const downloadReport = useCallback(async (target: ReportFileTarget) => {
    setDownloadingKey(target.key);
    try {
      await downloadReportFile(target.projectPath, target.file);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to download report",
      );
    } finally {
      setDownloadingKey(null);
    }
  }, []);

  const saveReportFile = useCallback(
    async (target: ReportFileTarget, content: string) => {
      setSavingKey(target.key);
      let data;
      let res: Response | null = null;
      try {
        const params = new URLSearchParams({
          path: target.projectPath,
          file: target.file.path,
        });
        res = await apiFetch(`/api/projects/reports/file/?${params}`, {
          method: "PATCH",
          body: JSON.stringify({ content }),
        });
        data = await readJson(res);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save report");
        return null;
      } finally {
        setSavingKey(null);
      }

      if (!res || !res.ok || !data) {
        toast.error(data?.error || "Failed to save report");
        return null;
      }

      const payload = data as ReportFilePayload;
      setPayloads((current) => ({
        ...current,
        [target.key]: payload,
      }));
      toast.success("Report saved");
      return payload;
    },
    [],
  );

  return {
    payloads,
    fileLoadingKey,
    deletingKey,
    downloadingKey,
    savingKey,
    loadReportFile,
    deleteReport,
    downloadReport,
    saveReportFile,
    setPayloads,
  };
};
