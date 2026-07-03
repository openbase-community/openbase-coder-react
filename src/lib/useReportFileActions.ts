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

export type ReportActionResult = {
  status: "started";
  thread_id: string;
  turn_id: string;
  thread_name?: string | null;
  agent_name?: string | null;
  origin_source?: string | null;
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
  const [actioningKey, setActioningKey] = useState<string | null>(null);
  const [followUpSendingKey, setFollowUpSendingKey] = useState<string | null>(null);

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
        return false;
      }

      setPayloads((current) => {
        const next = { ...current };
        delete next[target.key];
        return next;
      });
      onDeleted?.(target);
      toast.success("Report deleted");
      return true;
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

  const startReportAction = useCallback(
    async (target: ReportFileTarget): Promise<ReportActionResult | null> => {
      setActioningKey(target.key);
      try {
        const res = await apiFetch("/api/projects/reports/action/", {
          method: "POST",
          body: JSON.stringify({
            path: target.projectPath,
            file: target.file.path,
          }),
        });
        const data = await readJson<ReportActionResult & { error?: string }>(res);

        if (!res.ok || !data) {
          toast.error(data?.error || "Failed to start report implementation");
          return null;
        }

        toast.success("Implementation turn started");
        return data;
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to start report implementation",
        );
        return null;
      } finally {
        setActioningKey(null);
      }
    },
    [],
  );

  const sendReportFollowUp = useCallback(
    async (target: ReportFileTarget, threadId: string, message: string) => {
      const prompt = message.trim();
      if (!prompt) return false;

      setFollowUpSendingKey(target.key);
      try {
        const res = await apiFetch(
          `/api/threads/${encodeURIComponent(threadId)}/turns/`,
          {
            method: "POST",
            body: JSON.stringify({ prompt }),
          },
        );
        const data = await readJson<{ error?: string; turn_id?: string }>(res);
        if (!res.ok) {
          toast.error(data?.error || "Failed to send follow-up");
          return false;
        }
        toast.success("Follow-up sent");
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send follow-up");
        return false;
      } finally {
        setFollowUpSendingKey(null);
      }
    },
    [],
  );

  return {
    payloads,
    fileLoadingKey,
    deletingKey,
    downloadingKey,
    savingKey,
    actioningKey,
    followUpSendingKey,
    loadReportFile,
    deleteReport,
    downloadReport,
    saveReportFile,
    startReportAction,
    sendReportFollowUp,
    setPayloads,
  };
};
