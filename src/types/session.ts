export type ThreadStatus = "idle" | "waiting" | "running" | "completed" | "error";

export interface TurnSteer {
  text: string;
  created_at?: string | null;
}

export interface QueuedTurn {
  queue_id?: string | null;
  prompt: string;
  queued_at?: string | null;
}

export interface TurnInfo {
  turn_id: string;
  started_at: string;
  completed_at: string | null;
  status: ThreadStatus;
  accumulated_output: string;
  accumulated_stderr: string;
  return_code: number | null;
  prompt: string;
  model?: string | null;
  reasoning_effort?: string | null;
  steers?: TurnSteer[];
  /** Absolute paths of files the agent edited during the turn. */
  file_edits?: string[];
}

export interface ThreadInfo {
  thread_id: string;
  directory: string;
  name?: string | null;
  agent_name?: string | null;
  display_name: string;
  title?: string | null;
  preview?: string | null;
  is_likely_stale?: boolean;
  status_warning?: string | null;
  backend?: string | null;
  /** Backend-native conversation id (e.g. the Claude Code session id). */
  backend_session_id?: string | null;
  /** Model and reasoning effort last used by the thread's backend. */
  model?: string | null;
  reasoning_effort?: string | null;
  is_favorite?: boolean;
  favorited_at?: string | null;
  tags?: string[];
  created_at: string;
  updated_at: string;
  /** Device this thread was served from when it only exists on a peer. */
  origin_device?: string | null;
  /** MagicDNS host of that device, for direct REST/WebSocket connections. */
  origin_host?: string | null;
  current_turn: TurnInfo | null;
  turn_history: TurnInfo[];
  queued_turns?: QueuedTurn[];
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
  source?: string;
  worktrees?: Project[];
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
  title?: string | null;
  size: number;
  updated_at: number;
  tags?: string[];
  /** Device this report lives on when it only exists on a peer. */
  origin_device?: string | null;
  /** MagicDNS host of that device, for direct file reads. */
  origin_host?: string | null;
}

export interface ServiceStatus {
  name: string;
  port: number | null;
  url?: string | null;
  running: boolean;
  optional?: boolean;
  enabled?: boolean;
  command?: string;
  assertions?: Array<{
    flag: string;
    label: string;
  }>;
}
