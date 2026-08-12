import type { ReportsFile } from "@/types/session";

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
