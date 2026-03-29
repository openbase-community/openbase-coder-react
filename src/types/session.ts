export type SessionStatus = "idle" | "running" | "completed" | "error";

export interface RunInfo {
  run_id: string;
  started_at: string;
  completed_at: string | null;
  status: SessionStatus;
  accumulated_output: string;
  accumulated_stderr: string;
  return_code: number | null;
  message: string;
}

export interface SessionInfo {
  session_id: string;
  directory: string;
  created_at: string;
  current_run: RunInfo | null;
  run_history: RunInfo[];
  status: SessionStatus;
}

export type GitStatus = "clean" | "dirty" | "unpushed" | "no_git";

export interface Project {
  path: string;
  git_status?: GitStatus;
  stack?: string | null;
}

export interface ServiceStatus {
  name: string;
  port: number | null;
  url?: string | null;
  running: boolean;
}
