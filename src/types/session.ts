export type ThreadStatus = "idle" | "waiting" | "running" | "completed" | "error";

export interface TurnSteer {
  text: string;
  /** ``text`` as the user said or typed it (newer backends). */
  display_text?: string;
  /** Whether the steer arrived as a live speech transcript. */
  spoken?: boolean;
  created_at?: string | null;
}

export interface QueuedTurn {
  queue_id?: string | null;
  prompt: string;
  /** ``prompt`` as the user typed it (newer backends). */
  display_prompt?: string;
  spoken?: boolean;
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
  /** Raw prompt as the agent received it, with any injected scaffolding. */
  prompt: string;
  /** What the user said or typed, for transcript bubbles (newer backends). */
  display_prompt?: string;
  /** Whether the prompt arrived as a live speech transcript. */
  spoken?: boolean;
  model?: string | null;
  reasoning_effort?: string | null;
  steers?: TurnSteer[];
  /** Absolute paths of files the agent edited during the turn. */
  file_edits?: string[];
}

/** Where a thread pushed to a durable machine now lives (set on the old copy). */
export interface ThreadMovedTo {
  /** "pushing"/"uncertain" while the push is unfinished; "moved" after. */
  state: "pushing" | "uncertain" | "moved";
  device?: string | null;
  host?: string | null;
  thread_id?: string | null;
  at?: string | null;
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
  history_next_cursor?: string | null;
  continued_from?: { thread_id: string; name: string };
  continuations?: Array<{ thread_id: string; name: string }>;
  continuation_context?: { omitted: boolean; message_count: number };
  /** Set when this copy is read-only because the thread moved away. */
  moved_to?: ThreadMovedTo | null;
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
