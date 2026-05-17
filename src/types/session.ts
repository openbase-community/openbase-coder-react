export type ThreadStatus = "idle" | "running" | "completed" | "error";

export interface TurnInfo {
  turn_id: string;
  started_at: string;
  completed_at: string | null;
  status: ThreadStatus;
  accumulated_output: string;
  accumulated_stderr: string;
  return_code: number | null;
  prompt: string;
}

export interface ThreadInfo {
  thread_id: string;
  directory: string;
  created_at: string;
  updated_at: string;
  current_turn: TurnInfo | null;
  turn_history: TurnInfo[];
  status: ThreadStatus;
  is_livekit_shared?: boolean;
  is_livekit_dispatcher?: boolean;
  is_livekit_active_target?: boolean;
  livekit_voice_route_blocked_reason?: string;
}

export type GitStatus = "clean" | "dirty" | "unpushed" | "no_git";

export interface Project {
  path: string;
  git_status?: GitStatus;
  stack?: string | null;
  reports_count?: number;
  reports_updated_at?: number | null;
}

export type ReportsKind = "markdown" | "text" | "image" | "other";

export interface ReportsFile {
  path: string;
  name: string;
  kind: ReportsKind;
  size: number;
  updated_at: number;
}

export interface ServiceStatus {
  name: string;
  port: number | null;
  url?: string | null;
  running: boolean;
}
