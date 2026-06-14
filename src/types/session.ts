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
  agent_name?: string | null;
  display_name: string;
  title?: string | null;
  preview?: string | null;
  is_favorite?: boolean;
  favorited_at?: string | null;
  tags?: string[];
  created_at: string;
  updated_at: string;
  current_turn: TurnInfo | null;
  turn_history: TurnInfo[];
  status: ThreadStatus;
  voice_route?: {
    role: "none" | "dispatcher" | "active_target";
    active: boolean;
  };
  voice_assignment?: {
    thread_id: string;
    agent_name?: string | null;
    voice_id?: string | null;
    voice_name?: string | null;
    source: string;
  } | null;
}

export interface ThreadListResponse {
  threads: ThreadInfo[];
  count: number;
  page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
}

export type GitStatus =
  | "clean"
  | "dirty"
  | "out-of-sync"
  | "no_git"
  | "missing"
  | "unknown";

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
  tags?: string[];
}

export interface ServiceStatus {
  name: string;
  port: number | null;
  url?: string | null;
  running: boolean;
}
