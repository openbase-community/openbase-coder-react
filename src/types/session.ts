export type ThreadStatus = "idle" | "waiting" | "running" | "completed" | "error";

export interface TurnInfo {
  turn_id: string;
  started_at: string;
  completed_at: string | null;
  status: ThreadStatus;
  accumulated_output: string;
  accumulated_stderr: string;
  return_code: number | null;
  prompt: string;
  reasoning_effort?: string | null;
}

export interface ThreadInfo {
  thread_id: string;
  directory: string;
  name?: string | null;
  title?: string | null;
  preview?: string | null;
  created_at: string;
  updated_at: string;
  current_turn: TurnInfo | null;
  turn_history: TurnInfo[];
  status: ThreadStatus;
  is_livekit_dispatcher?: boolean;
  is_livekit_active_target?: boolean;
  livekit_voice_id?: string | null;
  livekit_voice_name?: string | null;
  livekit_dispatcher_voice_id?: string | null;
  livekit_dispatcher_voice_name?: string | null;
  livekit_active_target_voice_id?: string | null;
  livekit_active_target_voice_name?: string | null;
}

export interface ThreadListResponse {
  threads: ThreadInfo[];
  count: number;
  page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
}

export type GitStatus = "clean" | "dirty" | "unpushed" | "no_git" | "unknown";

export interface Project {
  path: string;
  git_status?: GitStatus;
  stack?: string | null;
  reports_count?: number;
  reports_updated_at?: number | null;
  global_reports?: boolean;
}

export interface ProjectListResponse {
  projects: Project[];
  count: number;
  page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
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
