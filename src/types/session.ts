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
  current_turn: TurnInfo | null;
  turn_history: TurnInfo[];
  status: ThreadStatus;
  is_livekit_shared?: boolean;
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
